import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {getLLMModel} from "../ai-backend/getLLMModel.js";
import {convertUIToolsToDummyServerTools} from "../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {insertTasksToNoteTool} from "../ai-frontend/tools/insertTasksToNoteTool.jsx";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK} from "../test/embed/chat.testdata.js";
import {getRandomSuggestions} from "../ai-frontend/getRandomSuggestions.js";
import {getUserTasksTool} from "../ai-frontend/tools/getUserTasksTool.jsx";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";

if(process.env.NODE_ENV === 'development') {
    window.userData = window.userData || EMBED_USER_DATA_MOCK;
    window.callAmplenotePlugin = window.callAmplenotePlugin || createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
}
else {
    if (window.INJECTED_USER_DATA_MOCK)
        window.userData = deserializeWithFunctions(window.INJECTED_USER_DATA_MOCK);
    if (window.INJECTED_EMBED_COMMANDS_MOCK)
        window.callAmplenotePlugin = createCallAmplenotePluginMock(deserializeWithFunctions(window.INJECTED_EMBED_COMMANDS_MOCK));
}

window.appConnector = new Proxy({}, {
    get: function(target, prop, receiver) {
        if (prop in target) {
            return target[prop];
        }
        return async function(...args) {
            return await window.callAmplenotePlugin(prop, ...args);
        };
    }
});
window.appSettings = window.appSettings || {};

// Resize iframe height to fit content handler
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    Object.assign(body.style, {
        height: `${iframeHeight - 24}px`,
        margin: '0',
    });
});
window.dispatchEvent(new Event('resize'));

// Init app
(async () => {
    try {
        showEmbedLoader();
        window.React = await dynamicImportESM("react");
        window.ReactDOM = await dynamicImportESM("react-dom/client");
        window.RadixUI = await dynamicImportESM("@radix-ui/themes");
        window.AssistantUI = await dynamicImportESM("@assistant-ui/react");
        window.appSettings = await appConnector.getSettings();
        window.LLM_MODEL = await getLLMModel(window.appSettings);
        window.ALL_TOOLS = [insertTasksToNoteTool(), getUserTasksTool()];
        hideEmbedLoader();
        if (!React || !ReactDOM) {
            throw new Error("Failed to load React or ReactDOM");
        }
        if(document.querySelector('.app-container'))
            ReactDOM.createRoot(document.querySelector('.app-container')).render(React.createElement(App));
    } catch (e) {
        window.document.body.innerHTML = '<div style="color: red; font-size: 20px; padding: 20px;">Error during init: ' + e.message + '</div>';
        console.error(e);
    }
})();


export const App = () => {
    // Create runtime
    const runtime = AssistantUI.useDangerousInBrowserRuntime({
        model: window.LLM_MODEL,
        maxSteps: 8,
        adapters: {
            attachments: new AssistantUI.CompositeAttachmentAdapter([
                new AssistantUI.SimpleImageAttachmentAdapter()
            ]),
        }
    });

    return (
        <RadixUI.Theme appearance="dark">
            <AssistantUI.AssistantRuntimeProvider runtime={runtime}>
                <Chat/>
            </AssistantUI.AssistantRuntimeProvider>
        </RadixUI.Theme>
    )
}

export const Chat = () => {
    // Fetch runtime
    const runtime = AssistantUI.useAssistantRuntime();
    const composer = AssistantUI.useThreadComposer();

    // onInit stuff
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
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {
        };
        runtime.thread.subscribe(() => {
            console.log(runtime.thread.getState());
            const currentMessages = (runtime.thread.getState()).messages;
            const messagesContainAttachments = currentMessages.some(message => message.attachments && message.attachments.length > 0);
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            removeLastRegisteredModelConfigProvider();
            window.userData = {...window.userData, ...window.appConnector.getUserCurrentNoteData()};
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
                    
                    Some useful terminology:
                    Daily Jot: A note that is created daily and is meant for them to store their thoughts and tasks for the day quickly.
                    Task: A task that the user wants to complete. Tasks are stored in notes. Tasks can be viewed by user in Agenda view (tasks view) and Calendar view. Agenda view has extensive filtering options. The Calendar Mode only shows tasks that are part of a Task Domain.
                    Task Domain: Task Domains are organizational containers that help separate tasks into meaningful groups like "Work" or "Personal." All created amplenote tasks belong to a domain. Domains can also pull in tasks from external calendars.
                    
                    Some information about the user:
                    ${[
                            window.userData.currentNoteUUID ? `Currently viewing Note UUID: ${window.userData.currentNoteUUID}` : '',
                            window.userData.currentNoteTitle ? `Currently viewing Note Title: ${window.userData.currentNoteTitle}` : '',
                            window.userData.dailyJotNoteUUID ? `Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID}` : '',
                            window.userData.invokerSelectionContent ? `Currently selected content: ${window.userData.invokerSelectionContent}` : ''
                        ].filter(Boolean).join('\n').trim()}
                    Current date and time: ${new Date().toISOString()}
                    `.trim().replaceAll(/\s+/g, ' ').trim() : null,
                    }
                }
            });
        });
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
                    suggestions: getRandomSuggestions(),
                }}
                tools={window.ALL_TOOLS}
            />
        </div>
    )
}