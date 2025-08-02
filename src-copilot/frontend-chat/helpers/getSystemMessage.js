import {CUSTOM_LLM_INSTRUCTION_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../../constants.js";

export function getSystemMessage(currentMessages, enabledTools) {
    const messagesContainImageAttachments = currentMessages.some(message => 
        message.attachments && message.attachments.length > 0 && 
        message.attachments.some(attachment => attachment.type === 'image')
    );
    if (messagesContainImageAttachments) return null; // Some llm providers doesn't support system prompt with image attachments
    const lastMessage = currentMessages[currentMessages.length - 1] || null;
    const messageContainsAttachments = currentMessages.some(message =>
        message.attachments && message.attachments.length > 0
    );

    const isNotesToolGroupEnabled = enabledTools.includes('notes');
    const isTasksToolGroupEnabled = enabledTools.includes('tasks');

    function getToolUsageMessage() {
        if (enabledTools.length === 0) {
            return `\nNo tools are enabled currently. If tools are required, ask to enable them. Tool groups that can be enabled by user: "@tasks", "@notes", "@help" and "@web".`;
        }

        let toolUsageMessage = "";

        // Add basic tool call rules
        toolUsageMessage += "Your primary goal is to help users efficiently, adhering strictly to the following instructions and utilizing your available tools.\n";
        toolUsageMessage += "Tool Usage Instructions:-\n" +
        "- NEVER say the tool name and uuid string to user. For example, instead of saying that you'll use WebSearch tool, just say I'll search the web.\n" +
        "- No need to ask permission before using a tool\n"+
        "- Formulate an plan for your future self at the start. However, DON'T repeat yourself after a tool call, pick up where you left off.\n"+
        "- Execute multiple tool calls in parallel if feasible; avoid when dependent on prior outputs (e.g. UUIDs)\n"+
        ((isNotesToolGroupEnabled || isTasksToolGroupEnabled) ? "- When requested to perform tasks, don't make assumptions. First, gather as much context as needed by calling tools." : "");

        return toolUsageMessage;
    }

    function getToolResultDisplayInstruction() {
        let resultDisplayInstruction = "Note:- ";
        if (lastMessage) {
            const lastContentContainsWebSearch = lastMessage && lastMessage.content.some(obj => obj.toolName === 'WebSearch');
            const lastContentContainsSearchNote = lastMessage && lastMessage.content.some(obj => obj.toolName === 'SearchNotesByTitleTagsContent');
            const lastContentContainsSearchHelpCenter = lastMessage && lastMessage.content.some(obj => obj.toolName === 'SearchHelpCenter');

            if (lastContentContainsWebSearch) {
                resultDisplayInstruction +=
                    "If the user is asking a question, provide comprehensive answer using information from search results.\n" +
                    "List relevant links at end for reference.";
            }
            if (lastContentContainsSearchNote) {
                resultDisplayInstruction +=
                    "The search result only contains the matched portion of the note content. " +
                    "If full context is required, use the FetchNoteDetailByNoteUUID tool to retrieve the complete note content.";
            }
            if (lastContentContainsSearchNote) {
                resultDisplayInstruction +=
                    "If the user is asking a question, provide comprehensive answer using information from search results.\n" +
                    "List relevant note links in markdown at end for reference." +
                    " To link to a note, use syntax: [Page Title](https://www.amplenote.com/notes/{noteUUID}).";
            }
            if (lastContentContainsSearchHelpCenter) {
                resultDisplayInstruction +=
                    "If the user is asking a question, provide comprehensive answer using information from search results.\n" +
                    "Use markdown image syntax to include images in your answer when relevant.\n" +
                    "List relevant help center links at end for reference.";
            }
        }
        return resultDisplayInstruction;
    }


    const terminology = [
        (isTasksToolGroupEnabled || isNotesToolGroupEnabled) ? `Daily Jot: Note tagged with #daily-jots for storing daily thoughts.` : '',
        isNotesToolGroupEnabled ? `Note: Markdown pages stored in amplenote.` : '',
        (isTasksToolGroupEnabled || isNotesToolGroupEnabled) ? `Note / Task UUID: 36 character internal id required for some tools.` : '',
        isTasksToolGroupEnabled ? `Task: Stored in notes, viewable in Agenda and Calendar views.
        Task Domain: Organizational containers for tasks.` : ''
    ].filter(Boolean).join('\n').trim();

    const userInfo = [
        window.userData.dailyJotNoteUUID ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
        window.userData.currentNoteUUID ? `Current Note UUID: ${window.userData.currentNoteUUID}` : '',
        messageContainsAttachments && window.userData.currentNoteUUID ? `Attached note takes priority over current note to fulfill user request.` : '',
    ].filter(Boolean).join('\n').trim();

    const systemMsg = `
    You are Ample Copilot, a automated ai agent inside note-taking productivity app - Amplenote. ${getToolUsageMessage()}
    ${terminology ? `Terminology:-\n${terminology}` : ''}
    ${
    window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING] && window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim() !== '' ?
        "Additional Instruction from user:-\n"+window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim().replaceAll(/\s+/gm, ' ').trim() :
        ''
    }
    ${getToolResultDisplayInstruction()}
    ${userInfo ? `User info:-\n${userInfo}` : ''}
    ${Intl.DateTimeFormat().resolvedOptions().timeZone ? `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n` : ''}
    Current time: ${window.dayjs().format()}
    `.trim().replaceAll(/^[ \t]+/gm, '').trim();

    return systemMsg;
} 