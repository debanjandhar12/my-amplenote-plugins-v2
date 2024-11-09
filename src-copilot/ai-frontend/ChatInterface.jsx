import {convertUIToolsToDummyServerTools} from "../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {useChatSuggestions} from "./hooks/useChatSuggestions.js";
import {CustomComposer} from "./CustomComposer.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    const thread = AssistantUI.useThread();
    const suggestions = useChatSuggestions(thread, 4);
    const composer = AssistantUI.useThreadComposer();

    // Based on user data, initialize assistant-ui chat
    React.useEffect(() => {
        if (window.userData.invokerImageSrc) {
            fetch(window.userData.invokerImageSrc)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], "image.jpg", { type: "image/jpeg" });
                    composer.addAttachment(file);
                });
        }
    }, []);

    // Create new chat button
    const onClickNewChat = React.useCallback(() => runtime.switchToNewThread(), [runtime]);

    // Handle tools and system prompt dynamically
    window.appConnector.getUserCurrentNoteData().then(async (userData) => {
        window.userData = {...window.userData, ...userData};    // update userData
    });
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {
        };
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const messagesContainAttachments = currentMessages.some(message => message.attachments && message.attachments.length > 0);
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
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
                    You are a helpful assistant inside Amplenote. Amplenote is a note-taking app that allows users to create and organize notes.
                    To interact with amplenote you need to call tools. If tool not available, ask user to write @tasks / @notes in message to enable them. You are tasked with helping user improve their productivity and provide information.  
                    When asked for your name, you must respond with "Ample Copilot".
                    
                    Some useful terminology:-
                    Daily Jot: A note that is created daily and is meant for them to store their thoughts and tasks for the day quickly.
                    Task: A task that the user wants to complete. Tasks are stored in notes. Tasks can be viewed by user in Agenda view (tasks view) and Calendar view. Agenda view has extensive filtering options. The Calendar Mode only shows tasks that are part of a Task Domain.
                    Task Domain: Task Domains are organizational containers that help separate tasks into meaningful groups like "Work" or "Personal." All created amplenote tasks belong to a domain. Domains can also pull in tasks from external calendars.
                    
                    Some information about the user:-
                    ${[
                            window.userData.dailyJotNoteUUID ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
                            window.userData.currentNoteUUID ? `Current Note UUID (note being viewed by user currently): ${window.userData.currentNoteUUID}` : '',
                            window.userData.currentNoteTitle ? `Note Title of current note: ${window.userData.currentNoteTitle}` : '',
                            window.userData.invokerSelectionContent ? `Currently selected content: ${window.userData.invokerSelectionContent}` : ''
                        ].filter(Boolean).join('\n').trim()}
                    Current date and time: ${new Date().toISOString()}
                    `.trim().replaceAll(/^[ \t]+/gm, '').trim() : null,
                    }
                }
            });
        });
        return () => {
            removeLastRegisteredModelConfigProvider();
        };
    }, [runtime]);

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <RadixUI.Box style={{
                display: 'flex', justifyContent: 'flex-end', paddingRight: '4px',
                position: 'sticky', top: 0, zIndex: '1000', backgroundColor: 'var(--color-background)'
            }}>
                <RadixUI.Button variant="soft" size="1" style={{marginRight: '4px', margin: '2px'}}
                                onClick={onClickNewChat}>
                    New Chat
                </RadixUI.Button>
            </RadixUI.Box>
            <AssistantUI.Thread
                welcome={{
                    suggestions: suggestions,
                }}
                tools={window.ALL_TOOLS}
                components={{
                    Composer: CustomComposer
                }}
            />
        </div>
    )
}