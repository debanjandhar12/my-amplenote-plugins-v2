import {useInnerRuntime} from "../hooks/useInnerRuntime.jsx";
import { CopilotChatHistoryDB } from '../helpers/CopilotChatHistoryDB';
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const RemoteAssistantRuntimeProvider = ({ children }) => {
    const innerRuntimeHook = React.useCallback(useInnerRuntime, []);
    const copilotChatHistoryDB = React.useMemo(() => new CopilotChatHistoryDB(), []);
    const callbacksRef = React.useRef(new Set());
    const {setRemoteThreadLoaded} = React.useContext(getChatAppContext());
    const runtime = AssistantUI.unstable_useRemoteThreadListRuntime({
        runtimeHook: innerRuntimeHook,
        list: async () => {
            const remoteThreads = await copilotChatHistoryDB.getAllThreads();
            setRemoteThreadLoaded(true);
            return {
                threads: remoteThreads
            };
        },
        delete: async (threadId) => {
            await copilotChatHistoryDB.deleteThread(threadId);
        },
        // TODO: Implement rename, archive, unarchive
        subscribe: (handler) => {
            callbacksRef.current.add(handler);
            // Return cleanup function to remove handler when component unmounts
            return () => callbacksRef.current.delete(handler);
        },
        initialize: async (threadId) => {
            const remoteThread = await copilotChatHistoryDB.getThread(threadId);
            if (remoteThread) {
                throw "Thread already exists in remote storage. Cannot initialize as new thread.";
            }
            const thread = {
                id: threadId,
                remoteId: threadId,
                name: `Copilot Chat - ${threadId}`,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                status: "regular"
            }
            await copilotChatHistoryDB.putThread(thread);
            return thread;
        }
    });

    const {AssistantRuntimeProvider} = window.AssistantUI;
    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}

export const useCustomChatHistoryManager = () => {
    const assistantRuntime = AssistantUI.useAssistantRuntime();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();
    const copilotChatHistoryDB = new CopilotChatHistoryDB();
    const {remoteThreadLoaded, setChatHistoryLoaded} = React.useContext(getChatAppContext());

    React.useEffect(() => {
        if (!remoteThreadLoaded) return;
        (async () => {
            const lastThread = await copilotChatHistoryDB.getLastUpdatedThread();
            if (lastThread) {
                await assistantRuntime.threads.switchToThread(lastThread.remoteId);
            } else {
                setChatHistoryLoaded(true);
            }
        })();
    }, [assistantRuntime, remoteThreadLoaded]);

    // TODO: hook after tool result
    const updateRemoteThreadMessages = async () => {
        try {
            const remoteThread = await copilotChatHistoryDB.getThread(threadListItemRuntime.getState().remoteId);
            if (remoteThread) {
                const exportMessages = threadRuntime.export();
                if (exportMessages.messages.length < 1) return;
                remoteThread.messages = threadRuntime.export();
                remoteThread.updated = new Date().toISOString();
                await copilotChatHistoryDB.putThread(remoteThread);
            }
        } catch (e) {
            console.error('Error persisting thread to CopilotChatHistoryDB:', e);
        }
    }
    threadRuntime.subscribe(async () => {
        if (threadRuntime.getState().isRunning) { // Prevent update when switching threads
            await updateRemoteThreadMessages();
        }
    });
    threadRuntime.unstable_on("run-start", async () => {
        await updateRemoteThreadMessages();
    });
    threadRuntime.unstable_on("run-end", async () => {
        await updateRemoteThreadMessages();
    });
    threadListItemRuntime.subscribe(async () => {
        try {
            if (!threadListItemRuntime.getState().remoteId) return;
            const remoteThread = await copilotChatHistoryDB.getThread(threadListItemRuntime.getState().remoteId);
            if (remoteThread && remoteThread.messages) {
                threadRuntime.import(remoteThread.messages);
            }
            setChatHistoryLoaded(true);
        } catch (e) {
            console.error('Error loading thread from CopilotChatHistoryDB:', e);
        }
    });
}