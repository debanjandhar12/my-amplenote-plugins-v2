import {initMarkMap} from "../markmap/renderer.js";
import {
    INITIAL_EXPAND_LEVEL_SETTING,
    INITIAL_EXPAND_LEVEL_SETTING_DEFAULT, SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING,
    SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING_DEFAULT,
    TITLE_AS_DEFAULT_NODE_SETTING,
    TITLE_AS_DEFAULT_NODE_SETTING_DEFAULT
} from "../constants.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {callAmplenotePluginCommandMock} from "../test/embed/embed.testdata.js";
import {createMockCallAmplenotePlugin, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";


if(process.env.NODE_ENV === 'development') {
    window.noteUUID = window.noteUUID || 'mock-uuid';
    window.callAmplenotePlugin = window.callAmplenotePlugin || createMockCallAmplenotePlugin(callAmplenotePluginCommandMock);
}
else if (window.callAmplenotePluginMock) {
    window.callAmplenotePlugin = createMockCallAmplenotePlugin(deserializeWithFunctions(window.callAmplenotePluginMock));
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

// On page load
(async () => {
    window.appSettings = await appConnector.getSettings()
    window.appSettings = {
        [TITLE_AS_DEFAULT_NODE_SETTING]: window.appSettings[TITLE_AS_DEFAULT_NODE_SETTING] || TITLE_AS_DEFAULT_NODE_SETTING_DEFAULT,
        [INITIAL_EXPAND_LEVEL_SETTING]: window.appSettings[INITIAL_EXPAND_LEVEL_SETTING] || INITIAL_EXPAND_LEVEL_SETTING_DEFAULT,
        [SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING]: window.appSettings[SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING] || SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING_DEFAULT
    };
    showEmbedLoader();
    await initMarkMap();
    hideEmbedLoader();
    window.dispatchEvent(new Event('resize')); // Resize iframe height to fit content
})();