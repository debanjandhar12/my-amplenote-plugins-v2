import {CopilotChatHistoryDB} from "../helpers/CopilotChatHistoryDB.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";

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
    // TODO: Currently we do not update CopilotChatHistoryDB for intermediate results. This is due to current limitations
    // with regards to tool invocations (cannot store formData, formError, formState)
    threadRuntime.unstable_on("run-start", async () => {
        await updateRemoteThreadMessages();
    });
    // This does not get called when tool is done running
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