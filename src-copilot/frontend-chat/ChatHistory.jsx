import {CopilotChatHistoryDB} from "./helpers/CopilotChatHistoryDB.js";

export const ChatHistory = () => {
    const assistantRuntime = AssistantUI.useAssistantRuntime();
    const chatHistoryDB = new CopilotChatHistoryDB();
    const allRemoteThreads = chatHistoryDB.getAllThreads();

    const deleteThread = async (threadId) => {
        await assistantRuntime.threads.getItemById(threadId).delete();
    }

    const openThread = async (threadId) => {
        await assistantRuntime.threads.switchToThread(threadId);
    }

    return (
        <>
        </>
    )
}