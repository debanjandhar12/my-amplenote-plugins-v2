import {useInnerRuntime} from "../hooks/useInnerRuntime.jsx";
import { CopilotChatHistoryDB } from '../helpers/CopilotChatHistoryDB';
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const RemoteAssistantRuntimeProvider = ({ children }) => {
    const innerRuntimeHook = React.useCallback(useInnerRuntime, []);
    const copilotChatHistoryDB = React.useMemo(() => new CopilotChatHistoryDB(), []);
    const callbacksRef = React.useRef(new Set());
    const runtime = AssistantUI.unstable_useRemoteThreadListRuntime({
        runtimeHook: innerRuntimeHook,
        list: async () => {
            const remoteThreads = await copilotChatHistoryDB.getAllThreads();
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

    React.useEffect(() => {
        (async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            const lastThread = await copilotChatHistoryDB.getLastOpenedThread();
            if (lastThread) {
                await assistantRuntime.threads.switchToThread(lastThread.remoteId);
            }
        })();
    }, [assistantRuntime]);

    threadRuntime.unstable_on("run-end", async () => {
        try {
            const remoteThread = await copilotChatHistoryDB.getThread(threadListItemRuntime.getState().remoteId);
            if (remoteThread) {
                remoteThread.messages = threadRuntime.export();
                remoteThread.updated = new Date().toISOString();
                await copilotChatHistoryDB.putThread(remoteThread);
            }
        } catch (e) {
            console.error('Error persisting thread to CopilotChatHistoryDB:', e);
        }
    });
    threadListItemRuntime.subscribe(async () => {
        try {
            if (!threadListItemRuntime.getState().remoteId) return;
            const remoteThread = await copilotChatHistoryDB.getThread(threadListItemRuntime.getState().remoteId);
            if (remoteThread && remoteThread.messages) {
                threadRuntime.import(remoteThread.messages);
            }
        } catch (e) {
            console.error('Error loading thread from CopilotChatHistoryDB:', e);
        }
    });
}