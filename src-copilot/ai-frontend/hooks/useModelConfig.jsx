import {convertUIToolsToDummyServerTools} from "../../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {CUSTOM_LLM_INSTRUCTION_SETTING} from "../../constants.js";

export function useModelConfig(runtime) {
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const messagesContainAttachments = currentMessages.some(message => message.attachments && message.attachments.length > 0);
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            const tasksWordMentioned = JSON.stringify(allUserMessages).includes("task");
            const notesWordMentioned = JSON.stringify(allUserMessages).includes("note") || JSON.stringify(allUserMessages).includes("page");
            const atTheRateLetterMentioned = JSON.stringify(allUserMessages).includes("@");
            const jotWordMentioned = JSON.stringify(allUserMessages).includes("jot");
            removeLastRegisteredModelConfigProvider();
            const toolsToAdd = window.ALL_TOOLS.filter(tool => tool.unstable_tool.triggerCondition({
                lastUserMessage,
                allUserMessages
            }));
            removeLastRegisteredModelConfigProvider = runtime.registerModelConfigProvider({
                getModelConfig: () => {
                    return {
                        tools: convertUIToolsToDummyServerTools([...toolsToAdd]),
                        system: !messagesContainAttachments ? `
                    You are a helpful assistant inside Amplenote, a note-taking app.
                    ${(notesWordMentioned || tasksWordMentioned || atTheRateLetterMentioned)
                            ? (toolsToAdd.length === 0 ? `To interact with Amplenote, call tools. If tools are absolutely necessary but cannot be called, ask the user to type @tool_name to enable them. If tool prepended with @ is typed by user, it is already enabled. Only "@tasks", "@notes" and "@web-search" are possible.` :
                                `To interact with Amplenote, call tools. At beginning before calling any tools, logically think and briefly write step-by-step tool call order ensuring to fetch required parameters first. Don't ever call multiple tools in parallel."`) : ''}
                    Help users improve productivity and provide information. When asked for your name, respond with "Ample Copilot".
                    
                    Terminology:-
                    ${[
                        (tasksWordMentioned || notesWordMentioned) ? `Daily Jot: Daily note for storing thoughts and tasks.` : '',
                        notesWordMentioned ? `Note / Page: Markdown notes in amplenote. Markdown supports [[noteTitle]] to link to other notes.` : '',
                        notesWordMentioned ? `Note UUID: 36 character internal id. User does not understand this. Get this by calling Search note with note name if required.` : '',
                        tasksWordMentioned ? `Task: Stored in notes, viewable in Agenda and Calendar views.
                        Task Domain: Organizational containers for tasks, pulling in tasks from external calendars and Amplenote. All tasks belong to a domain.` : ''
                    ].filter(Boolean).join('\n').trim()}
                    
                    User info:-
                    ${[
                        window.userData.dailyJotNoteUUID && (tasksWordMentioned || jotWordMentioned) ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
                        window.userData.currentNoteUUID ? `Current Note UUID (note being viewed): ${window.userData.currentNoteUUID}` : '',
                        window.userData.currentNoteTitle ? `Current note title: ${window.userData.currentNoteTitle}` : '',
                        window.userData.invokerSelectionContent ? `Currently selected content: ${window.userData.invokerSelectionContent}` : ''
                    ].filter(Boolean).join('\n').trim()}
                    Current time: ${window.dayjs().format()}
                    ${Intl.DateTimeFormat().resolvedOptions().timeZone ? `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n` : ''}
                    ${
                        window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING] && window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim() !== '' ?
                            "Additional Instruction from user:-\n"+window.appSettings[CUSTOM_LLM_INSTRUCTION_SETTING].trim().replaceAll(/\s+/gm, ' ').trim() :
                            null
                    }
                    `.trim().replaceAll(/^[ \t]+/gm, '').trim() : null,
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
