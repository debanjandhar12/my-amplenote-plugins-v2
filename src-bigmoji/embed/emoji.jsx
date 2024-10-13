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
        console.log(emoji);
        setEmojiObj({
            emojiUUID: Math.random().toString(36).substring(7),
            type: emoji.unified ? 'default' : 'custom',
            emojiCode: emoji.unified,
            url: emoji.src, // will be null if emoji is default
            size: '32',
            skin: emoji.skin // this can be null
        });
    };
    const handleAddCustomEmoji = async () => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.png, .jpeg';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async function(e) {
                        try {
                            const imageBase64 = e.target.result;
                            const emojiId = await appConnector.prompt("Enter emoji name:", {
                                inputs: [
                                    { label: "Emoji name", type: "text", value: file.name.replace(/\.[^/.]+$/, "").replaceAll(' ', '_') }
                                ]
                            });
                            if (!emojiId || emojiId.trim() === "") {
                                app.alert("Emoji name cannot be empty");
                            }
                            await appConnector.addCustomEmoji(emojiId, imageBase64);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    resolve();
                }
            });
            input.click();
        });
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
