import {initMarkMap} from "../markmap/renderer.js";
import {
    INITIAL_EXPAND_LEVEL_SETTING,
    INITIAL_EXPAND_LEVEL_SETTING_DEFAULT, SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING,
    SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING_DEFAULT,
    TITLE_AS_DEFAULT_NODE_SETTING,
    TITLE_AS_DEFAULT_NODE_SETTING_DEFAULT
} from "../constants.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {
    deserializeWithFunctions,
    getDummyApp,
    getOnEmbedCallingAppProxy
} from "../../common-utils/embed-comunication.js";
import {mockApp} from "../test/embed.testdata.js";


if(process.env.NODE_ENV === 'development') {
    window.noteUUID = 'mock-uuid';
}
if (window.callAmplenotePlugin) {
    console.log('ok');
    window.app = getOnEmbedCallingAppProxy();
    console.log(window.app.context.url);
} else if (window.mockApp) {
    window.app = {...getDummyApp(), ...deserializeWithFunctions(window.mockApp)}
} else if(process.env.NODE_ENV === 'development') {
    window.app = {...getDummyApp(), ...mockApp};
} else  {
    console.log('ok');
    window.app = getDummyApp();
}

// Resize iframe height to fit content handler
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    body.style.height = (iframeHeight-24) + 'px';
});

// On page load
(async () => {
    window.appSettings = await window.app.settings;
    window.appSettings = {
        [TITLE_AS_DEFAULT_NODE_SETTING]: window.appSettings[TITLE_AS_DEFAULT_NODE_SETTING] || TITLE_AS_DEFAULT_NODE_SETTING_DEFAULT,
        [INITIAL_EXPAND_LEVEL_SETTING]: window.appSettings[INITIAL_EXPAND_LEVEL_SETTING] || INITIAL_EXPAND_LEVEL_SETTING_DEFAULT,
        [SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING]: window.appSettings[SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING] || SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING_DEFAULT
    };
    window.noteTitle = await (await window.app.notes.find(window.noteUUID)).name;
    showEmbedLoader();
    await initMarkMap();
    hideEmbedLoader();
    window.dispatchEvent(new Event('resize')); // Resize iframe height to fit content
})();