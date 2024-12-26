import {convertUIToolsToDummyServerTools} from "../../backend/utils/convertUIToolsToDummyServerTools.js";
import {CUSTOM_LLM_INSTRUCTION_SETTING} from "../../constants.js";
import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";

export function useModelConfig(runtime) {
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const messagesContainImageAttachments = currentMessages.some(message => message.attachments && message.attachments.length > 0
                && message.attachments.some(attachment => attachment.type === 'image'));
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const lastMessage = currentMessages[currentMessages.length - 1] || null;
            const lastLastMessage = currentMessages[currentMessages.length - 2] || null;
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            const tasksWordMentioned = JSON.stringify(allUserMessages).includes("task");
            const notesWordMentioned = JSON.stringify(allUserMessages).includes("note") || JSON.stringify(allUserMessages).includes("page");
            const atTheRateLetterMentioned = JSON.stringify(allUserMessages).includes("@");
            const jotWordMentioned = JSON.stringify(allUserMessages).includes("jot");
            removeLastRegisteredModelConfigProvider();
            const toolsToAdd = ToolRegistry.getAllTools().filter(tool => tool.unstable_tool.triggerCondition({
                lastUserMessage,
                allUserMessages
            }));
            removeLastRegisteredModelConfigProvider = runtime.registerModelConfigProvider({
                getModelConfig: () => {
                    const systemMsg = !messagesContainImageAttachments ? `
                    You are an AI assistant named Ample Copilot inside Amplenote, a note-taking app. You help users improve productivity and provide accurate information.
                    ${function() {
                        if (!(notesWordMentioned || tasksWordMentioned || atTheRateLetterMentioned)) {
                            return '';
                        }

                        if (toolsToAdd.length === 0) {
                            return `To interact with Amplenote, call tools. If tools are very much required but cannot be called, ask the user to type @tool_name to enable them. If tool prepended with @ is typed by user, it is already enabled. Only "@tasks", "@notes" and "@web-search" are possible.`;
                        }

                        let toolUsageMessage = "Don't call multiple tools in parallel as tool result needs to be awaited.";
                        if (lastMessage && (lastMessage.role === 'user' ||
                            (lastMessage.role === 'assistant' && lastMessage.content.length <= 1))) {
                            // If current message by assistant has one or less calls
                            toolUsageMessage ="To interact with Amplenote, call tools. Before tool call, think and write short step-by-step plan for your future self inside <toolplan></toolplan> tags ensuring to fetch required parameters first. Then, make only the first tool call in same reply. Example plan to add tag in note title: <toolplan>1. Search note by title to get noteUUID since we don't have it. 2. Fetch note tag detail if not present in search result. 3. Update note tags.</toolplan>"
                                + " " + "The <toolplan> will only be visible to you and not to user. Do not talk to user about parameters directly."
                                + " " + toolUsageMessage;
                        } else {
                            toolUsageMessage += "To interact with Amplenote, call tools." + " " + toolUsageMessage;
                        }

                        let resultInstruction = "";
                        if (lastMessage || lastLastMessage) {
                            const lastContentContainsWebSearch = lastMessage && lastMessage.content.some(obj => obj.toolName === 'WebSearch');
                            const lastContentContainsSearchNote = lastMessage && lastMessage.content.some(obj => obj.toolName === 'SearchNotesByTitleTagsContent');
                            const lastLastContentContainsWebSearch = lastLastMessage && lastLastMessage.content.some(obj => obj.toolName === 'WebSearch');
                            const lastLastContentContainsSearchNote = lastLastMessage && lastLastMessage.content.some(obj => obj.toolName === 'SearchNotesByTitleTagsContent');
                            if (lastContentContainsWebSearch || lastLastContentContainsWebSearch) {
                                resultInstruction = "If the user is asking specifically to search web, cite source links in markdown at end.";
                            }
                            if (lastContentContainsSearchNote || lastLastContentContainsSearchNote) {
                                resultInstruction = "If the user is asking specifically to search information inside note, cite source note links in markdown at end." +
                                    " To link to a note, use syntax: [Page Title](https://www.amplenote.com/notes/{noteUUID}).";
                            }
                        }
                        return resultInstruction.trim() !== '' ? toolUsageMessage + " " + resultInstruction : 
                                                                 toolUsageMessage; 
                    }()}
                    
                    Terminology:-
                    ${[
                        (tasksWordMentioned || notesWordMentioned) ? `Daily Jot: Daily note for storing thoughts and tasks.` : '',
                        notesWordMentioned ? `Note / Page: Markdown notes in amplenote.` : '',
                        notesWordMentioned ? `Note UUID: 36 character internal id. User does not understand this. Get this by calling Search note with note name if required.` : '',
                        tasksWordMentioned ? `Task: Stored in notes, viewable in Agenda and Calendar views.
                        Task Domain: Organizational containers for tasks, pulling in tasks from external calendars and Amplenote. All tasks belong to a domain.` : ''
                    ].filter(Boolean).join('\n').trim()}
                    
                    User info:-
                    ${[
                        window.userData.dailyJotNoteUUID && (tasksWordMentioned || jotWordMentioned) ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
                        window.userData.currentNoteUUID && notesWordMentioned ? `Current Note UUID: ${window.userData.currentNoteUUID}` : '',
                    ].filter(Boolean).join('\n').trim()}
                    Current time: ${window.dayjs().format()}
                    ${Intl.DateTimeFormat().resolvedOptions().timeZone ? `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n` : ''}
                    ${
                        window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING] && window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim() !== '' ?
                            "Additional Instruction from user:-\n"+window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim().replaceAll(/\s+/gm, ' ').trim() :
                            ''
                    }
                    `.trim().replaceAll(/^[ \t]+/gm, '').trim() : null;
                    return {
                        tools: convertUIToolsToDummyServerTools([...toolsToAdd]),
                        system: systemMsg
                    }
                }
            });
        });
        return () => {
            removeLastRegisteredModelConfigProvider();
        };
    }, [runtime]);
    return runtime.thread.getModelConfig();
}
