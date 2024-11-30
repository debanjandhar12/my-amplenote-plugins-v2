import dynamicImportESM, {dynamicImportCSS, dynamicImportMultipleESM} from "../../common-utils/dynamic-import-esm.js";
import {getLLMModel} from "../ai-backend/getLLMModel.js";
import {InsertTasksToNote} from "../ai-frontend/tools/InsertTasksToNote.jsx";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK} from "../test/embed/chat.testdata.js";
import {FetchUserTasks} from "../ai-frontend/tools/FetchUserTasks.jsx";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {WebSearch} from "../ai-frontend/tools/WebSearch.jsx";
import {overwriteWithAmplenoteStyle} from "../ai-frontend/utils/overwriteWithAmplenoteStyle.jsx";
import {CreateNewNotes} from "../ai-frontend/tools/CreateNewNotes.jsx";
import {FetchNoteDetailByNoteUUID} from "../ai-frontend/tools/FetchNoteDetailByNoteUUID.jsx";
import {SearchNotesByTitleTagsContent} from "../ai-frontend/tools/SearchNotesByTitleTagsContent.jsx";
import {DeleteTasks} from "../ai-frontend/tools/DeleteTasks.jsx";
import {DeleteUserNotes} from "../ai-frontend/tools/DeleteUserNotes.jsx";
import {UpdateUserNotes} from "../ai-frontend/tools/UpdateUserNotes.jsx";
import {UpdateUserTasks} from "../ai-frontend/tools/UpdateUserTasks.jsx";
import {InsertContentToNote} from "../ai-frontend/tools/InsertContentToNote.jsx";
import {ChatApp} from "../ai-frontend/ChatApp.jsx";
import {WebBrowser} from "../ai-frontend/tools/WebBrowser.jsx";

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
        margin: '0',
    });
    const appInnerContainer = document.querySelector('.app-container > div > div');
    if (appInnerContainer) {
        Object.assign(appInnerContainer.style, {
            height: `${iframeHeight}px`,
            overflow: 'hidden',
        });
    }
});
setInterval(() => window.dispatchEvent(new Event('resize')), 100);

// Init app
(async () => {
    try {
        showEmbedLoader();
        overwriteWithAmplenoteStyle();
        const cssLoaded = Promise.all([
                dynamicImportCSS("@assistant-ui/react/dist/styles/index.css"),
                dynamicImportCSS("@radix-ui/themes/styles.css"),
                dynamicImportCSS("@assistant-ui/react-markdown/dist/styles/markdown.css")]);
        const [React, ReactDOM, AssistantUI, AssistantUIUtilsDangerousInBrowserAdapter, AssistantUIUtilssplitLocalRuntimeOptions,
            RadixUI, AssistantUIMarkdown, RadixIcons, StringDiffModule]
            = await dynamicImportMultipleESM(["react", "react-dom/client", "@assistant-ui/react",
                "@assistant-ui/react/src/runtimes/dangerous-in-browser/DangerousInBrowserAdapter.js",
                "@assistant-ui/react/src/runtimes/local/LocalRuntimeOptions.js", "@radix-ui/themes",
                "@assistant-ui/react-markdown", "@radix-ui/react-icons", "react-string-diff"]);
        window.AssistantUIMarkdown = AssistantUIMarkdown.makeMarkdownText();
        console.log(AssistantUIMarkdown);
        window.React = React;
        window.ReactDOM = ReactDOM;
        window.AssistantUI = AssistantUI;
        window.RadixUI = RadixUI;
        window.AssistantUIUtils = {};
        window.AssistantUIUtils.DangerousInBrowserAdapter = AssistantUIUtilsDangerousInBrowserAdapter.DangerousInBrowserAdapter;
        window.AssistantUIUtils.splitLocalRuntimeOptions = AssistantUIUtilssplitLocalRuntimeOptions.splitLocalRuntimeOptions;
        window.RadixIcons = RadixIcons;
        window.StringDiff = StringDiffModule.StringDiff;
        window.dayjs = (await dynamicImportESM("dayjs")).default;
        window.Tribute = (await dynamicImportESM("tributejs")).default;
        window.appSettings = await appConnector.getSettings();
        window.LLM_MODEL = await getLLMModel(window.appSettings);
        window.ALL_TOOLS = [InsertTasksToNote(), FetchUserTasks(), WebSearch(), WebBrowser(),
            CreateNewNotes(), FetchNoteDetailByNoteUUID(), SearchNotesByTitleTagsContent(),
            UpdateUserNotes(), UpdateUserTasks(),
            InsertContentToNote(),
            DeleteTasks(), DeleteUserNotes()];
        window.TOOL_CATEGORY_NAMES = ['tasks', 'notes', 'web'];
        hideEmbedLoader();
        if (!React || !window.ReactDOM) {
            throw new Error("Failed to load React or ReactDOM");
        }
        if(document.querySelector('.app-container'))
            window.ReactDOM.createRoot(document.querySelector('.app-container')).render(<ChatApp />);
    } catch (e) {
        window.document.body.innerHTML = '<div style="color: red; font-size: 20px; padding: 20px;">Error during init: ' + e.message + '</div>';
        console.error(e);
    }
})();

