import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { isEqual, debounce } from "lodash-es";

export const useCustomChatHistoryManager = () => {
    const assistantRuntime = AssistantUI.useAssistantRuntime();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();
    const { remoteThreadLoaded, setChatHistoryLoaded } = React.useContext(getChatAppContext());
    const lastLoadedThreadId = React.useRef(null);

    // Effect for initial thread loading: find the last opened thread and switch to it.
    React.useEffect(() => {
        if (!remoteThreadLoaded) return;

        const loadInitialThread = async () => {
            try {
                const lastThread = await appConnector.getLastOpenedChatThreadFromCopilotDB();
                if (lastThread) {
                    // Switching will trigger the threadListItemRuntime listener to load messages
                    await assistantRuntime.threads.switchToThread(lastThread.remoteId);
                } else {
                    // No thread exists in remote storage, so we create a new one
                    await assistantRuntime.threads.switchToNewThread();
                }
            } catch (e) {
                console.error('Error loading initial thread:', e);
                setChatHistoryLoaded(true); // Unblock UI on error
            }
        };

        loadInitialThread();
    }, [assistantRuntime, remoteThreadLoaded, setChatHistoryLoaded]);


    // Effect for persisting thread messages to the database when they change.
    React.useEffect(() => {
        const updateRemoteThreadMessages = async () => {
            try {
                const mainThreadId = assistantRuntime.threads.getState().mainThreadId;

                const remoteThread = await appConnector.getChatThreadFromCopilotDB(mainThreadId);
                if (!remoteThread) return;

                const exportMessages = assistantRuntime.thread.export();

                // Do not update if there are no messages or if messages are identical
                if (exportMessages.messages.length < 1 || isEqual(remoteThread.messages, exportMessages)) {
                    return;
                }

                // Update the thread object and save it
                remoteThread.messages = exportMessages;
                remoteThread.updated = new Date().toISOString();
                remoteThread.opened = new Date().toISOString();
                await appConnector.saveChatThreadToCopilotDB(remoteThread);
            } catch (e) {
                console.error('Error persisting thread to backend:', e);
            }
        };

        // Debounce the update function to prevent excessive writes during streaming responses.
        const debouncedUpdate = debounce(updateRemoteThreadMessages, 1000, {
            leading: true,
            trailing: true
        });

        const unsubscribe = assistantRuntime.thread.subscribe(debouncedUpdate);

        return () => {
            debouncedUpdate.cancel(); // Clean up pending debounced calls
            unsubscribe();
        };
    }, [assistantRuntime]);


    // Effect for loading messages from the database when a thread is switched.
    React.useEffect(() => {
        const loadThreadMessages = async () => {
            try {
                const threadId = threadListItemRuntime.getState().remoteId;

                // Prevent re-loading the same thread unnecessarily
                if (lastLoadedThreadId.current === threadId) return;
                lastLoadedThreadId.current = threadId;

                setChatHistoryLoaded(false);
                const remoteThread = await appConnector.getChatThreadFromCopilotDB(threadId);

                // To prevent race conditions, only import if the current thread is the one we fetched for.
                if (threadListItemRuntime.getState().remoteId === threadId &&
                    remoteThread && remoteThread.messages) {
                    await threadRuntime.import(remoteThread.messages);
                } else if (threadListItemRuntime.getState().status === 'new') {
                    // Required to initialize new threads and make them regular
                    await threadRuntime.import({ messages: [] });
                }
                if (remoteThread) {
                    remoteThread.opened = new Date().toISOString();
                    await appConnector.saveChatThreadToCopilotDB(remoteThread);
                }

                // Set ChatHistoryLoaded to true only when the thread is initialized (has remote id)
                // and we have loaded the chat history (conversation)
                if (threadId)
                    setChatHistoryLoaded(true);
            } catch (e) {
                console.error('Error loading thread from backend:', e);
                setChatHistoryLoaded(true); // Unblock UI on error
            }
        };

        const unsubscribe = threadListItemRuntime.subscribe(loadThreadMessages);

        // Initial load for the currently selected thread on mount
        if (remoteThreadLoaded) loadThreadMessages();

        return () => unsubscribe();
    }, [threadListItemRuntime, threadRuntime, remoteThreadLoaded, setChatHistoryLoaded]);
};
