import {CopilotChatHistoryDB} from "../helpers/CopilotChatHistoryDB.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";
import {isEqual} from "lodash-es";

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

    // Update CopilotChatHistoryDB when new messages state is modified
    const updateRemoteThreadMessages = async () => {
        try {
            const remoteThread = await copilotChatHistoryDB.getThread(threadListItemRuntime.getState().remoteId);
            if (remoteThread) {
                const exportMessages = threadRuntime.export();
                // Do not update when no message or during thread switching
                if (exportMessages.messages.length < 1) return;
                if(remoteThread.messages &&
                    exportMessages.messages[0].message.id !== remoteThread.messages.messages[0].message.id) {
                    return;
                }
                if (isEqual(remoteThread.messages, exportMessages)) return;
                remoteThread.messages = exportMessages;
                remoteThread.updated = new Date().toISOString();
                await copilotChatHistoryDB.putThread(remoteThread);
            }
        } catch (e) {
            console.error('Error persisting thread to CopilotChatHistoryDB:', e);
        }
    }
    threadRuntime.subscribe(async () => {
        await updateRemoteThreadMessages();
    });

    // Load messages from CopilotChatHistoryDB when thread is switched
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