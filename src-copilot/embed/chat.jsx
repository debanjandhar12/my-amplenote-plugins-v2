import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {getLLMModel} from "../ai-backend/getLLMModel.js";
import {convertUIToolsToDummyServerTools} from "../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {InsertTasksToNote} from "../ai-frontend/tools/InsertTasksToNote.jsx";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK} from "../test/embed/chat.testdata.js";
import {FetchUserTasks} from "../ai-frontend/tools/FetchUserTasks.jsx";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {ChatInterface} from "../ai-frontend/ChatInterface.jsx";
import {WebSearch} from "../ai-frontend/tools/WebSearch.jsx";
import {injectAmplenoteColors} from "../ai-frontend/utils/injectAmplenoteColors.jsx";
import {CreateNewNotes} from "../ai-frontend/tools/CreateNewNotes.jsx";
import {FetchNoteInfoByNoteUUID} from "../ai-frontend/tools/FetchNoteInfoByNoteUUID.jsx";
import {VectorSearchNotes} from "../ai-frontend/tools/VectorSearchNotes.jsx";
import {DeleteUserTasks} from "../ai-frontend/tools/DeleteUserTasks.jsx";
import {DeleteUserNotes} from "../ai-frontend/tools/DeleteUserNotes.jsx";

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
        injectAmplenoteColors();
        window.React = await dynamicImportESM("react");
        window.ReactDOM = await dynamicImportESM("react-dom/client");
        window.ReactDOMTestUtils = await dynamicImportESM("react-dom/test-utils");
        window.RadixUI = await dynamicImportESM("@radix-ui/themes");
        window.AssistantUI = await dynamicImportESM("@assistant-ui/react");
        window.RadixIcons = await dynamicImportESM("@radix-ui/react-icons");
        window.Tribute = (await dynamicImportESM("tributejs")).default;
        window.appSettings = await appConnector.getSettings();
        window.LLM_MODEL = await getLLMModel(window.appSettings);
        window.ALL_TOOLS = [InsertTasksToNote(), FetchUserTasks(), WebSearch(),
            CreateNewNotes(), FetchNoteInfoByNoteUUID(), VectorSearchNotes(),
            DeleteUserTasks(), DeleteUserNotes()];
        window.TOOL_CATEGORY_NAMES = ['all-tools', 'tasks', 'notes', 'web-search'];
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
    // Setup runtime
    const runtime = AssistantUI.useDangerousInBrowserRuntime({
        model: window.LLM_MODEL,
        maxSteps: 6,
        adapters: {
            attachments: new AssistantUI.CompositeAttachmentAdapter([
                new AssistantUI.SimpleImageAttachmentAdapter()
            ]),
        }
    });

    return (
        <RadixUI.Theme appearance="dark" accentColor="blue">
            <AssistantUI.AssistantRuntimeProvider runtime={runtime}>
                <ChatInterface />
            </AssistantUI.AssistantRuntimeProvider>
        </RadixUI.Theme>
    )
}