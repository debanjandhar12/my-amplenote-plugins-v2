import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {getLLMModel} from "../ai-backend/getLLMModel.js";
import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../constants.js";
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
    body.style.height = (iframeHeight-24) + 'px';
});

// Init app
(async () => {
    try {
        showEmbedLoader();
        window.React = await dynamicImportESM("react");
        window.ReactDOM = await dynamicImportESM("react-dom/client");
        window.RadixUI = await dynamicImportESM("@radix-ui/themes");
        window.AssistantUI = await dynamicImportESM("@assistant-ui/react");
        window.useDangerousInBrowserRuntime = window.AssistantUI.useDangerousInBrowserRuntime;
        window.makeAssistantToolUI = window.AssistantUI.makeAssistantToolUI;
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
    const runtime = useDangerousInBrowserRuntime({
        model: window.LLM_MODEL,
        maxSteps: 8,
        system: `
        You are a helpful assistant inside Amplenote. Amplenote is a note-taking app that allows users to create and organize notes.
        You are tasked with helping user improve their productivity. When asked for your name, you must respond with "Ample Copilot".
        
        Some useful terminology:
        Daily Jot: A note that is created daily and is meant for them to store their thoughts and tasks for the day quickly.
        Task: A task that the user wants to complete. Tasks are stored in notes. Tasks can be viewed by user in Agenda view (tasks view) and Calendar view. Agenda view has extensive filtering options. The Calendar Mode only shows tasks that are part of a Task Domain.
        Task Domain: Task Domains are organizational containers that help separate tasks into meaningful groups like "Work" or "Personal." All created amplenote tasks belong to a domain. Domains can also pull in tasks from external calendars.
        
        Some information about the user:
        Currently viewing Note UUID: ${window.userData.currentNoteUUID}
        Currently viewing Note Title: ${window.userData.currentNoteTitle}
        Today's daily jot note UUID: ${window.userData.dailyJotNoteUUID || ''}
        Current date and time: ${new Date().toISOString()}
        `.trim().replaceAll(/\s+/g, ' ').trim(),
    });
    runtime.thread.subscribe(() => {
        console.log(runtime.thread.getState());
        const currentMessages = (runtime.thread.getState()).messages;
        const currentTools = runtime.thread.getModelConfig().tools;
        const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
        const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
        const currentToolsNames = Object.keys(currentTools || {});
        const toolsToAdd = window.ALL_TOOLS.filter(tool => !currentToolsNames.includes(tool.unstable_tool.toolName)
            && tool.unstable_tool.triggerCondition({lastUserMessage, allUserMessages}));
        runtime.registerModelConfigProvider({getModelConfig: () => { return {
                tools: convertUIToolsToDummyServerTools([...toolsToAdd])
        }}});
    });
    return ( <RadixUI.Theme>
        <AssistantUI.Thread
            welcome={{
                suggestions: getRandomSuggestions(),
            }}
            runtime={runtime}
            tools={window.ALL_TOOLS}
        />
    </RadixUI.Theme>
    )
}
