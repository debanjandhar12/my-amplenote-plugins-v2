import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import emojiHTML from "inline:./embed/emoji.html";
import {getURLFromEmojiObj} from "./embed/utils/getURLFromEmojiCode.jsx";

const plugin = {
    embedResult: false,
    waitTimeout: null,
    insertText: {
        "Insert emoji": async function (app) {
            await app.openSidebarEmbed(1, null);
            await plugin._waitForEmbedResult(app);
            await app.context.replaceSelection(plugin._getImageMarkdown(plugin.embedResult));
        }
    },
    imageOption: {
        "Modify emoji": async function (app, image) {
            const emojiObj = JSON.parse(decodeURIComponent(image.src.split('?')[1]));
            await app.openSidebarEmbed(1, emojiObj);
            await plugin._waitForEmbedResult(app);
            await app.context.replaceSelection(plugin._getImageMarkdown(plugin.embedResult));
        }
    },
    _waitForEmbedResult: async function (app) {
        plugin.embedResult = null;
        plugin.waitTimeout = 1000;
        while (true) {
            if (plugin.embedResult != null || plugin.waitTimeout <= 0) break;
            plugin.waitTimeout -= 100;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (plugin.embedResult === null) return '';
    },
    _getImageMarkdown: function (emojiObj) {
        console.log(emojiObj);
        const url = getURLFromEmojiObj(emojiObj);
        return `![|${emojiObj.size}](${url}?${encodeURIComponent(JSON.stringify(emojiObj))}) ${emojiObj}`;
    },
    renderEmbed(app, args, source = 'sidebar') {
        try {
            const emojiObj = args;
            return addWindowVariableToHtmlString(emojiHTML, 'emojiData', emojiObj);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        "refreshTimeout": async function (app) {
            plugin.waitTimeout = 600;
        },
        "setEmbedResult": async function (app, emojiCode) {
            try {
                plugin.embedResult = emojiCode;
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    })
}

export default plugin;
