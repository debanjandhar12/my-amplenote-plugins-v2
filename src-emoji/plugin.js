import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import emojiHTML from "inline:./embed/emoji.html";
import {getURLFromEmojiObj} from "./embed/utils/getURLFromEmojiCode.jsx";
import {parseMarkdownTable} from "./markdown/parseMarkdownTable.js";
import {getMarkdownFrom2dArray} from "./markdown/getMarkdownFrom2dArray.js";

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
        "Modify emoji": {
            check: (app, image) => {
                try {
                    const emojiObj = JSON.parse(decodeURIComponent(image.src.split('?')[1]));
                    return true;
                } catch (e) { }
                return false;
            },
            run: async (app, image) => {
                const emojiObj = JSON.parse(decodeURIComponent(image.src.split('?')[1]));
                await app.openSidebarEmbed(1, emojiObj);
                await plugin._waitForEmbedResult(app);
                await app.context.replaceSelection(plugin._getImageMarkdown(plugin.embedResult));
            }
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
    renderEmbed(app, args, source = 'sidebar') {
        try {
            const emojiObj = args;
            return addWindowVariableToHtmlString(emojiHTML, 'emojiData', emojiObj);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    _getImageMarkdown: function (emojiObj) {
        const url = getURLFromEmojiObj(emojiObj);
        return `![|${emojiObj.size}](${url}?${encodeURIComponent(JSON.stringify(emojiObj))}) ${emojiObj}`;
    },
    _findOrCreateCustomEmojisNote: async function (app) {
        // Find note with note name "Custom Bigmojis", create it if it doesn't exist
        const customEmojisNoteTitle = "Custom Bigmojis";
        let customEmojisNote = await app.findNote({name: customEmojisNoteTitle});
        if (!customEmojisNote) {
            customEmojisNote = await app.notes.create(customEmojisNoteTitle, []);
            if (!customEmojisNote || !customEmojisNote.uuid) {
                throw new Error(`Failed to create dashboard note: ${dashboardNoteTitle}`);
            }
        }
        customEmojisNote = await app.notes.find(customEmojisNote.uuid);
        return customEmojisNote;
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
        },
        "getCustomEmojis": async function (app) {
            const customEmojisNote = await plugin._findOrCreateCustomEmojisNote(app);

            // Get custom emojis from note
            const customEmojis = await app.getNoteContent({uuid: customEmojisNote.uuid});
            const customEmojis2dArray = parseMarkdownTable(customEmojis);

            // Transform the 2D table array into an array of emoji objects
            return customEmojis2dArray.map(row => {
                if (row.length !== 2) {
                    throw new Error(`Invalid custom emoji row: ${row}`);
                }
                const emojiId = row[0];
                const emojiImg = row[1];
                const emojiUrlMatch = emojiImg.match(/!\[.*?\]\((.*?)\)/);
                const emojiUrl = emojiUrlMatch ? emojiUrlMatch[1] : null;
                console.log(row, emojiUrlMatch);
                if (!emojiId || !emojiUrl) {
                    return null;
                }
                if (!emojiUrl.match(/^https?:\/\//)) {
                    throw new Error(`Invalid emoji URL: ${emojiUrl}`);
                }
                return {
                    id: emojiId,
                    name: emojiId,
                    skins: [{ src: emojiUrl }],
                };
            }).filter(emoji => emoji);
        },
        "addCustomEmoji": async function (app, emojiId, emojiImgBase64) {
            try {
                const customEmojisNote = await plugin._findOrCreateCustomEmojisNote(app);
                const customEmojis = await app.getNoteContent({uuid: customEmojisNote.uuid});
                const customEmojis2dArray = parseMarkdownTable(customEmojis);
                const emojiUrl = await app.attachNoteMedia(customEmojisNote.uuid, emojiImgBase64);
                const newEmojis2dArray = [...customEmojis2dArray, [emojiId, `![](${emojiUrl})`]];
                const newCustomEmojis = getMarkdownFrom2dArray(newEmojis2dArray);
                await app.replaceNoteContent({uuid: customEmojisNote.uuid}, newCustomEmojis);
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
    })
}

export default plugin;
