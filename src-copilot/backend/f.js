"use client";

import { AssistantRuntimeProvider, useEdgeRuntime, unstable_useRemoteThreadListRuntime as useRemoteThreadRuntime, useThreadListItem, unstable_RemoteThreadListSubscriber } from "@assistant-ui/react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { getAuthToken } from '../lib/utils';
import { FeedbackModal } from '../components/ui/feedback';
import { submitFeedback } from '../controller/update';
import { create } from "zustand";

export function RuntimeProvider({
                                    children,
                                }: Readonly<{
    children: React.ReactNode;
}>) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingFeedback, setPendingFeedback] = useState<any>(null);

    const callbacksRef = useRef(new Set<unstable_RemoteThreadListSubscriber>());

    // Memoize the store creation
    const useRuntimeCallbacks = useMemo(() => create<{ initialize: (threadId: string) => Promise<void> }>((set) => ({
        initialize: async (threadId: string) => {
            // Create a new thread object
            const thread = {
                id: threadId,
                name: 'New Chat',
                created: new Date().toISOString(),
                archived: false
            };

            // Load and update threads atomically
            const existingThreads = JSON.parse(localStorage.getItem('assistant-threads') || '[]');
            localStorage.setItem('assistant-threads', JSON.stringify([...existingThreads, thread]));

            // Notify all registered callbacks about the new thread
            console.log("useRuntimeCallbacks CALLED",  callbacksRef.current);
            callbacksRef.current.forEach((callback) => {
                console.log("onInitialize CALLED");
                callback.onInitialize(threadId, async () => {
                    return {
                        remoteId: thread.id,
                        externalId:  undefined
                    }
                });
            });
        }
    })), []); // Empty dependency array since this should only be created once

    const runtimeHook = useCallback(() => {
        const threadId = useThreadListItem((i) => i.id);

        const innerRuntime = useEdgeRuntime({
            api: process.env.NEXT_PUBLIC_ENVIRONMENT_URL + "/api/insight",
            headers: {
                "Authorization": `Bearer ${getAuthToken() || ''}`,
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            },
            adapters: {
                feedback: {
                    submit: ({ message, type }) => {
                        setPendingFeedback({ message, type });
                        setIsModalOpen(true);
                    }
                }
            }
        });

        // Initialize thread when context is available
        useEffect(() => {
            return innerRuntime.thread.unstable_on("initialize", () => {
                // console.log("INITIALIZE CALLED");
                useRuntimeCallbacks.getState().initialize(threadId);
            });
        }, [threadId]);

        return innerRuntime;
    }, []);

    const runtime = useRemoteThreadRuntime({
        runtimeHook,
        list: async () => {
            // Load threads from localStorage
            const threads = localStorage.getItem('assistant-threads');
            const rawThreads = threads ? JSON.parse(threads) : [];

            // Transform the data to match RemoteThreadListResponse format
            return {
                threads: rawThreads.map((t: any) => ({
                    status: t.archived ? "archived" : "regular",
                    remoteId: t.id,
                    externalId: undefined,
                    title: t.name
                }))
            };
        },
        delete: async (threadId: string) => {
            const threads = localStorage.getItem('assistant-threads');
            const existingThreads = threads ? JSON.parse(threads) : [];
            const updatedThreads = existingThreads.filter((t: any) => t.id !== threadId);
            localStorage.setItem('assistant-threads', JSON.stringify(updatedThreads));
        },
        archive: async (threadId: string) => {
            const threads = localStorage.getItem('assistant-threads');
            const existingThreads = threads ? JSON.parse(threads) : [];
            const updatedThreads = existingThreads.map((t: any) =>
                t.id === threadId ? { ...t, archived: true } : t
            );
            localStorage.setItem('assistant-threads', JSON.stringify(updatedThreads));
        },
        unarchive: async (threadId: string) => {
            const threads = localStorage.getItem('assistant-threads');
            const existingThreads = threads ? JSON.parse(threads) : [];
            const updatedThreads = existingThreads.map((t: any) =>
                t.id === threadId ? { ...t, archived: false } : t
            );
            localStorage.setItem('assistant-threads', JSON.stringify(updatedThreads));
        },
        rename: async (threadId: string, newName: string) => {
            const threads = localStorage.getItem('assistant-threads');
            const existingThreads = threads ? JSON.parse(threads) : [];
            const updatedThreads = existingThreads.map((t: any) =>
                t.id === threadId ? { ...t, name: newName } : t
            );
            localStorage.setItem('assistant-threads', JSON.stringify(updatedThreads));
        },
        subscribe: (handler: any) => {
            callbacksRef.current.add(handler);
            // Return cleanup function to remove handler when component unmounts
            return () => callbacksRef.current.delete(handler);
        },
    });

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
            <FeedbackModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={(reason) => {
                    console.log({ ...pendingFeedback, reason }, "Feedback submitted with reason");
                    setPendingFeedback(null);
                }}
            />
        </AssistantRuntimeProvider>
    );
}