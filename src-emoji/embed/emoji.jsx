import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMOJI_DATA_MOCK} from "../test/embed/emoji.testdata.js";
import {EMBED_COMMANDS_MOCK} from "../test/embed/emoji.testdata.js";
import {EmojiPickerPage} from "./pages/EmojiPickerPage.jsx";

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

export const App = () => {
    const [data, setData] = React.useState(null);

    return <EmojiPickerPage />;
};

(async () => {
    window.React = await dynamicImportESM("react");
    window.ReactDOM = await dynamicImportESM("react-dom/client");
    if (!React || !ReactDOM) {
        throw new Error("Failed to load React or ReactDOM");
    }
    if(document.querySelector('.app-container'))
        ReactDOM.createRoot(document.querySelector('.app-container')).render(React.createElement(App));
})();

