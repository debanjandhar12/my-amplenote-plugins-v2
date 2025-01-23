import dynamicImportESM, {
    dynamicImportCSS,
    dynamicImportGithubBundle
} from "../../common-utils/dynamic-import-esm.js";
import {getLLMModel} from "../backend/getLLMModel.js";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK} from "../test/chat/chat.testdata.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {overwriteWithAmplenoteStyle} from "../frontend/overwriteWithAmplenoteStyle.js";
import {ChatApp} from "../frontend/ChatApp.jsx";
import {parse} from "../markdown/markdown-parser.js";
import {ToolRegistry} from "../frontend/tools-core/registry/ToolRegistry.js";
import {ToolCategoryRegistry} from "../frontend/tools-core/registry/ToolCategoryRegistry.js";
import {makeCustomMarkdownText} from "../frontend/components/makeCustomMarkdownText.jsx";

if(process.env.NODE_ENV === 'development') {
    window.callAmplenotePlugin = window.callAmplenotePlugin || createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
}
else {
    if (window.INJECTED_EMBED_COMMANDS_MOCK)
        window.callAmplenotePlugin = createCallAmplenotePluginMock(deserializeWithFunctions(window.INJECTED_EMBED_COMMANDS_MOCK));
}

window.appConnector = new Proxy({}, {
    get: function(target, prop, receiver) {
        if (prop in target) {
            return target[prop];
        }
        return async function(...args) {
            window.dispatchEvent(new CustomEvent('callAmplenotePlugin', {detail: [prop, ...args]}));
            return await window.callAmplenotePlugin(prop, ...args);
        };
    }
});
window.appSettings = window.appSettings || {};
window.userData = window.userData || {};

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
        const [React, ReactDOM, AssistantUI, RadixUI, AssistantUIMarkdown,
            RadixIcons, StringDiffModule]
            = await dynamicImportGithubBundle('assistantUIBundle.js');
        window.AssistantUIMarkdown = AssistantUIMarkdown;
        window.AssistantUIMarkdownComponent = makeCustomMarkdownText();
        window.React = React;
        window.ReactDOM = ReactDOM;
        window.AssistantUI = AssistantUI;
        window.RadixUI = RadixUI;
        window.AssistantUIUtils = {};
        window.AssistantUIUtils.DangerousInBrowserAdapter = (await dynamicImportESM("@assistant-ui/react/src/runtimes/dangerous-in-browser/DangerousInBrowserAdapter.ts")).DangerousInBrowserAdapter;
        window.AssistantUIUtils.splitLocalRuntimeOptions = (await dynamicImportESM("@assistant-ui/react/src/runtimes/local/LocalRuntimeOptions.tsx")).splitLocalRuntimeOptions;
        window.RadixIcons = RadixIcons;
        window.StringDiff = StringDiffModule.StringDiff;
        window.dayjs = (await dynamicImportESM("dayjs")).default;
        window.Tribute = (await dynamicImportESM("tributejs")).default;
        parse(''); // Load unified js in background
        window.appSettings = await appConnector.getSettings();
        window.LLM_MODEL = await getLLMModel(window.appSettings);
        hideEmbedLoader();
        ToolRegistry.registerAllTools();
        ToolCategoryRegistry.registerAllCategory();
        if (!React || !window.ReactDOM) {
            throw new Error("Failed to load React or ReactDOM");
        }
        if(document.querySelector('.app-container'))
            window.ReactDOM.createRoot(document.querySelector('.app-container')).render(<ChatApp />);
    } catch (e) {
        window.document.body.innerHTML = '<div class="error" style="color: red; font-size: 20px; padding: 20px;">Error during init: ' + e.message + '</div>';
        console.error(e);
    } finally {
        window.dispatchEvent(new CustomEvent('appLoaded'));
    }
})();

