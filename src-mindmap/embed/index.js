import {initMarkMap} from "../markmap/renderer.js";
import {
    INITIAL_EXPAND_LEVEL_SETTING,
    INITIAL_EXPAND_LEVEL_SETTING_DEFAULT, SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING,
    SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING_DEFAULT,
    TITLE_AS_DEFAULT_NODE_SETTING,
    TITLE_AS_DEFAULT_NODE_SETTING_DEFAULT
} from "../constants.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";

window.app = {};
if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    window.noteUUID = 'mock-uuid';
    window.app.getSettings = async function() {
        return {  };
    }
    window.app.getNoteContent = async function() {
        return `| | | | | |
|-|-|-|-|-|
|**Cover**|**Title**|**Author**|**Updated At**|**Omnivore Link**|
|![https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fdaf07af7-5cdb-4ecc-aace-1a46de3e9c58_1827x1090.png\\|180](https://proxy-prod.omnivore-image-cache.app/320x320,sTgJ5Q0XIg_EHdmPWcxtXFmkjn8T6hkJt7S9ziClagYo/https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fdaf07af7-5cdb-4ecc-aace-1a46de3e9c58_1827x1090.png)|[Organize your Omnivore library with labels](https://www.amplenote.com/notes/852b17e4-41ad-11ef-856d-6ef34fa959ce) |The Omnivore Team|7/14/2024, 11:13:03 AM|[Omnivore Link](https://omnivore.app/me/organize-your-omnivore-library-with-labels) |
# sdsada [Amplenote Omnivore](https://www.amplenote.com/notes/506ac00a-3077-11ef-b2d3-2aa30a147f2e) [Google](www.google.com)
Hi\\
Hi2

Hi3

\\

> Hi4
\`\`\`javascript
console.log('Hello world');
\`\`\`

- [ ] 🖌️ Rename this note if you want to keep your inbox note named something more creative
- [ ] 🖌️ Rename2
`;
    };
    window.app.navigate = async (url) => window.open(url, '_blank');
    window.app.getNoteTitle = async ()  => 'Mock Note Title';
    window.app.saveFile = async () => true;
    window.app.prompt = (message, options) => {
        return new Promise((resolve) => {
            resolve({type: 'success', result: 'Save as png image'});
        });
    }
    window.app.setSetting = async (key, value) => true;
    window.app.getSettings = () => {
        return {  };
    }
}
window.app = new Proxy(window.app, {
    get: function(target, prop, receiver) {
        if (prop in target) {
            return target[prop];
        }
        return async function(...args) {
            const returnObj = window.callAmplenotePlugin && await window.callAmplenotePlugin(prop, ...args);
            if (returnObj.type === 'success') {
                return returnObj.result;
            } else if (returnObj.type === 'error') {
                throw new Error(returnObj.result);
            }
        };
    }
});

// Resize iframe height to fit content handler
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    body.style.height = (iframeHeight-24) + 'px';
    // TODO: markmap.rescale ?
});

// On page load
(async () => {
    window.appSettings = await window.app.getSettings();
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