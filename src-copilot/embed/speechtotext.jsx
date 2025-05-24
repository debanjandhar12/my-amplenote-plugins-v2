import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK} from "../test/frontend-chat/chat.testdata.js";
import {overwriteWithAmplenoteStyle} from "../frontend-chat/overwriteWithAmplenoteStyle.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {
    dynamicImportCSS,
    dynamicImportExternalPluginBundle
} from "../../common-utils/dynamic-import-esm.js";
import {SpeechToTextApp} from "../frontend-speechtotext/SpeechToTextApp.jsx";

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
            window.dispatchEvent(new CustomEvent('callAmplenotePlugin', [prop, ...args]));
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
            height: `${iframeHeight - 24}px`,
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
        const cssLoaded = dynamicImportCSS("@radix-ui/themes/styles.css");
        const [React, ReactDOM, RadixUI, RadixIcons] = await dynamicImportExternalPluginBundle('searchUIBundle.js');
        window.React = React;
        window.ReactDOM = ReactDOM;
        window.RadixUI = RadixUI;
        window.RadixIcons = RadixIcons;
        window.appSettings = await appConnector.getSettings();
        hideEmbedLoader();
        if (!React || !window.ReactDOM) {
            throw new Error("Failed to load React or ReactDOM");
        }
        if(document.querySelector('.app-container'))
            window.ReactDOM.createRoot(document.querySelector('.app-container')).render(<SpeechToTextApp />);
    } catch (e) {
        window.document.body.innerHTML = '<div style="color: red; font-size: 20px; padding: 20px;">Error during init: ' + e.message + '</div>';
        console.error(e);
    } finally {
        // Wait for few seconds and then call appLoaded event
        await new Promise(resolve => setTimeout(resolve, 1600));
        window.dispatchEvent(new CustomEvent('appLoaded'));
    }
})();