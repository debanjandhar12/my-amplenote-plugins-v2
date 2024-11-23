import {convertUIToolsToDummyServerTools} from "../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./CustomComposer.jsx";
import {CUSTOM_LLM_AVATAR_SETTING, CUSTOM_LLM_INSTRUCTION_SETTING} from "../constants.js";
import {ChatInterfaceHeader} from "./ChatInterfaceHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    const thread = AssistantUI.useThread();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions(thread, 4);

    // Based on user data, initialize assistant-ui chat
    React.useEffect(() => {
        if (window.userData.invokerImageSrc) {
            fetch(window.userData.invokerImageSrc)
                .then(response => response.blob())
                .then(async blob => {
                    const file = new File([blob], "image.jpg", { type: "image/jpeg" });
                    await threadRuntime.composer.addAttachment(file);
                });
        }
    }, []);

    // Handle tools and system prompt dynamically
    window.appConnector.getUserCurrentNoteData().then(async (userData) => {
        window.userData = {...window.userData, ...userData};    // update userData
    });
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const messagesContainAttachments = currentMessages.some(message => message.attachments && message.attachments.length > 0);
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            const tasksWordMentioned = JSON.stringify(allUserMessages).includes("task");
            const notesWordMentioned = JSON.stringify(allUserMessages).includes("note") || JSON.stringify(allUserMessages).includes("page");
            removeLastRegisteredModelConfigProvider();
            const toolsToAdd = window.ALL_TOOLS.filter(tool => tool.unstable_tool.triggerCondition({
                lastUserMessage,
                allUserMessages
            }));
            removeLastRegisteredModelConfigProvider = runtime.registerModelConfigProvider({
                getModelConfig: () => {
                    return {
                        tools: convertUIToolsToDummyServerTools([...toolsToAdd]),
                        // System Prompt (system prompt not supported when using attachments)
                        system: !messagesContainAttachments ? `
                    You are a helpful assistant inside Amplenote, a note-taking app.
                    To interact with Amplenote, call tools. If tools are needed but unavailable, ask the user to type "@tasks" or "@notes" to enable them. If "@tasks" or "@notes" prepended with @ is already typed by user, they are enabled.
                    Help users improve productivity and provide information. When asked for your name, respond with "Ample Copilot".
                    
                    Terminology:-
                    Daily Jot: Daily note for storing thoughts and tasks.
                    ${notesWordMentioned ? `Note / Page: Markdown notes in amplenote. Link to other notes with [[noteTitle]].` : ''}
                    ${tasksWordMentioned ? `Task: Stored in notes, viewable in Agenda and Calendar views.
                    Task Domain: Organizational containers for tasks, pulling in tasks from external calendars and Amplenote. All tasks belong to a domain.` : ''}
                    
                    User info:-
                    ${[
                            window.userData.dailyJotNoteUUID ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
                            window.userData.currentNoteUUID ? `Current Note UUID (note being viewed): ${window.userData.currentNoteUUID}` : '',
                            window.userData.currentNoteTitle ? `Current note title: ${window.userData.currentNoteTitle}` : '',
                            window.userData.invokerSelectionContent ? `Currently selected content: ${window.userData.invokerSelectionContent}` : ''
                        ].filter(Boolean).join('\n').trim()}
                    Current time: ${new Date().toISOString()}
                    
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

    const { Thread } = window.AssistantUI;

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <ChatInterfaceHeader />
            <Thread
                welcome={{
                    suggestions: suggestions,
                }}
                assistantAvatar={assistantAvatar}
                tools={window.ALL_TOOLS}
                components={{
                    Composer: CustomComposer
                }}
            />
        </div>
    )
}