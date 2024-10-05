import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMOJI_DATA_MOCK} from "../test/embed/emoji.testdata.js";
import {EMBED_COMMANDS_MOCK} from "../test/embed/emoji.testdata.js";
import {EmojiPickerPage} from "./pages/EmojiPickerPage.jsx";
import {useCustomStyles} from "./hooks/useCustomStyles.jsx";
import {EmojiSizePage} from "./pages/EmojiSizePage.jsx";
import {getURLFromEmojiObj} from "./utils/getURLFromEmojiCode.jsx";

if(process.env.NODE_ENV === 'development') {
    window.emojiData = window.emojiData || EMOJI_DATA_MOCK;
    window.callAmplenotePlugin = window.callAmplenotePlugin || createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
}
else {
    if (window.INJECTED_EMBED_COMMANDS_MOCK)
        window.callAmplenotePlugin = createCallAmplenotePluginMock(deserializeWithFunctions(window.INJECTED_EMBED_COMMANDS_MOCK));
    if (window.INJECTED_EMOJI_DATA_MOCK)
        window.emojiData = deserializeWithFunctions(window.INJECTED_EMOJI_DATA_MOCK);
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

// send signal to so that onclose event can be detected
setInterval(() => {
    if (document.querySelector('.app-container'))
        window.appConnector.refreshTimeout();
}, 100);

// Resize iframe height to fit content handler
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    body.style.height = (iframeHeight-24) + 'px';
});

(async () => {
    window.React = await dynamicImportESM("react");
    window.ReactDOM = await dynamicImportESM("react-dom/client");
    window.Picker = (await dynamicImportESM("@emoji-mart/react")).default;
    if (!React || !ReactDOM) {
        throw new Error("Failed to load React or ReactDOM");
    }
    if(document.querySelector('.app-container'))
        ReactDOM.createRoot(document.querySelector('.app-container')).render(React.createElement(App));
})();

export const App = () => {
    const [emojiObj, setEmojiObj] = React.useState(null);
    useCustomStyles();
    const handleEmojiSelect = (emoji) => {
        setEmojiObj({
            emojiUUID: Math.random().toString(36).substring(7),
            type: 'default',
            emojiCode: emoji.unified,
            url: null,
            size: '32'
        });
    };
    const handleAddCustomEmoji = (emoji) => {
        console.log(emoji);
    };
    const handleSubmit = (size) => {
        window.appConnector.setEmbedResult({
            ...emojiObj,
            size
        });
        document.body.style.backgroundColor = '#192025';
        document.body.innerHTML = '<span style="color: aliceblue">Please close this window.</span>';
    };
    return(!emojiObj ?
        <EmojiPickerPage onSelectEmoji={handleEmojiSelect} onAddCustomEmoji={handleAddCustomEmoji} />  :
        <EmojiSizePage selectedEmoji={emojiObj} onSubmit={handleSubmit} />
    )
};
