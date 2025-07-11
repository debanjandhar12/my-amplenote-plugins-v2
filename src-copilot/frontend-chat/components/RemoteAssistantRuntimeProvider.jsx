import {useInnerRuntime} from "../hooks/useInnerRuntime.jsx";

import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const RemoteAssistantRuntimeProvider = ({ children }) => {
    const innerRuntimeHook = React.useCallback(useInnerRuntime, []);

    const callbacksRef = React.useRef(new Set());
    const {setRemoteThreadLoaded} = React.useContext(getChatAppContext());
    const runtime = AssistantUI.unstable_useRemoteThreadListRuntime({
        runtimeHook: innerRuntimeHook,
        list: async () => {
            const remoteThreads = await appConnector.getAllChatThreadsFromCopilotDB();
            setRemoteThreadLoaded(true);
            return {
                threads: remoteThreads
            };
        },
        delete: async (threadId) => {
            await appConnector.deleteChatThreadFromCopilotDB(threadId);
        },
        // TODO: Implement rename, archive, unarchive
        subscribe: (handler) => {
            callbacksRef.current.add(handler);
            // Return cleanup function to remove handler when component unmounts
            return () => callbacksRef.current.delete(handler);
        },
        initialize: async (threadId) => {
            const remoteThread = await appConnector.getChatThreadFromCopilotDB(threadId);
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
            await appConnector.saveChatThreadToCopilotDB(thread);
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

