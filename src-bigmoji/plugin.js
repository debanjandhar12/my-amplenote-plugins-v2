import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import emojiHTML from "inline:./embed/emoji.html";
import {getURLFromEmojiObj} from "./embed/utils/getURLFromEmojiCode.jsx";
import {parseMarkdownTable} from "./markdown/parseMarkdownTable.js";
import {getMarkdownFrom2dArray} from "./markdown/getMarkdownFrom2dArray.js";
import dynamicImportESM from "../common-utils/dynamic-import-esm.js";

const plugin = {
    embedResult: false,
    waitTimeout: null,
    insertText: {
        "Insert emoji": async function (app) {
            const isSidebarOpenSuccess = await app.openSidebarEmbed(1, null, 'sidebar');
            if (!isSidebarOpenSuccess) {
                await app.context.replaceSelection(`<object data="plugin://${app.context.pluginUUID}" data-aspect-ratio="1" />`);
            }
            await plugin._waitForEmbedResult(app);
            await plugin._handlePluginEmbedResult(app, isSidebarOpenSuccess);
        }
    },
    imageOption: {
        "Modify emoji": {
            check: (app, image) => {
                try {
                    const emojiObj = JSON.parse(decodeURIComponent(image.src.split('?')[1]));
                    if (!emojiObj) return false;    // dont check emojiObj.emojiCode as it can be null due to a bug in earlier versions
                    return true;
                } catch (e) { }
                return false;
            },
            run: async (app, image) => {
                const emojiObj = JSON.parse(decodeURIComponent(image.src.split('?')[1]));
                const isSidebarOpenSuccess = await app.openSidebarEmbed(1, emojiObj, 'sidebar');
                if (!isSidebarOpenSuccess) {
                    await app.context.replaceSelection(`<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(emojiObj))}" data-aspect-ratio="1" />`);
                }
                await plugin._waitForEmbedResult(app);
                await plugin._handlePluginEmbedResult(app, isSidebarOpenSuccess);
            }
        }
    },
    replaceText: {
        "Modify emoji": {
            check: async (app, text) => {
                try {
                    if (!plugin.getEmojiDataFromNative) {
                        const emojiMartData = (await dynamicImportESM("@emoji-mart/data")).default;
                        const {init, getEmojiDataFromNative} = await dynamicImportESM("emoji-mart");
                        await init({data: emojiMartData});
                        plugin.getEmojiDataFromNative = getEmojiDataFromNative;
                    }
                    const emojiData = await plugin.getEmojiDataFromNative(text.trim());
                    if (!emojiData) return false;
                    if (!emojiData.unified) return false;
                    return true;
                } catch (e) { }
                return false;
            },
            run: async (app, text) => {
                const emojiObj = {
                    emojiUUID: Math.random().toString(36).substring(7),
                    type: 'default',
                    native: (await plugin.getEmojiDataFromNative(text.trim())).native,
                    emojiCode: (await plugin.getEmojiDataFromNative(text.trim())).unified,
                    size: '15'  // 15 means native size
                };
                const isSidebarOpenSuccess = await app.openSidebarEmbed(1, emojiObj, 'sidebar');
                if (!isSidebarOpenSuccess) {
                    await app.context.replaceSelection(`<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(emojiObj))}" data-aspect-ratio="1" />`);
                }
                await plugin._waitForEmbedResult(app);
                await plugin._handlePluginEmbedResult(app, isSidebarOpenSuccess);
            }
        }
    },
    _handlePluginEmbedResult: async function (app, isSidebarOpenSuccess) {
        if (plugin.embedResult && isSidebarOpenSuccess) {
            const opResult = await app.context.replaceSelection(plugin._getImageMarkdown(plugin.embedResult));
            if (!opResult) await app.alert('Failed to insert emoji. Possibly due to user moving selection or note.');
        } else if (plugin.embedResult && !isSidebarOpenSuccess) {
            const currentNote = await app.findNote({uuid: app.context.noteUUID});
            const currentNoteContent = await app.getNoteContent({uuid: currentNote.uuid});
            const objectTagRegex = new RegExp(`<object data="plugin://${app.context.pluginUUID}.*?" />`, 'g');
            const objectTagMatch = currentNoteContent.match(objectTagRegex);
            if (objectTagMatch) {
                const newNoteContent = currentNoteContent.replace(objectTagRegex, plugin._getImageMarkdown(plugin.embedResult));
                await app.replaceNoteContent({uuid: currentNote.uuid}, newNoteContent);
            }
            else throw new Error('Failed to replace selection with emoji. Possibly due to invalid note content.');
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
    },
    renderEmbed(app, args, source = 'embed') {
        try {
            let emojiObj = args;
            if (source !== 'sidebar' && args) {
                emojiObj = JSON.parse(decodeURIComponent(args));
            }
            return addWindowVariableToHtmlString(emojiHTML, 'emojiData', emojiObj);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    _getImageMarkdown: function (emojiObj) {
        if (emojiObj.size === '15')
            return emojiObj.native;
        const url = getURLFromEmojiObj(emojiObj);
        return `![|${emojiObj.size}](${url}?${encodeURIComponent(JSON.stringify(emojiObj))}) <!-- dummy comment -->`;
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
            const isActive = plugin.waitTimeout > 0;
            if (!isActive) return false;
            plugin.waitTimeout = 400;
            return true;
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
                    console.error(`Possible invalid custom emoji row: ${row}. Will try to proceed.`);
                }
                const emojiId = row[0];
                const emojiImg = row[1];
                const emojiUrlMatch = emojiImg.match(/!\[.*?\]\((.*?)\)/);
                const emojiUrl = emojiUrlMatch ? emojiUrlMatch[1] : null;
                if (!emojiId || !emojiUrl || emojiUrl.trim() === '' || emojiUrl.trim() === '') {
                    console.error(`Emoji Id or Emoji URL is missing in row: ${row}.`);
                    return null;
                }
                if (!emojiUrl.match(/^https?:\/\//)) {
                    console.error(`Invalid emoji URL in row: ${row}.`);
                    return null;
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
                // Fetch custom emojis
                const customEmojisNote = await plugin._findOrCreateCustomEmojisNote(app);
                const customEmojis = await app.getNoteContent({uuid: customEmojisNote.uuid});
                const customEmojis2dArray = parseMarkdownTable(customEmojis);
                // Add new emoji to table
                const emojiUrl = await app.attachNoteMedia(customEmojisNote.uuid, emojiImgBase64);
                const newEmojis2dArray = [...customEmojis2dArray, [emojiId, `![](${emojiUrl})`]];
                // Add header if it doesn't exist
                if (newEmojis2dArray[0][0].trim() !== 'Emoji ID' && newEmojis2dArray[0][1].trim() !== 'Image') {
                    newEmojis2dArray.unshift(['Emoji ID', 'Emoji']);
                }
                // Convert 2D array to markdown
                const newCustomEmojis = getMarkdownFrom2dArray(newEmojis2dArray);
                // Replace the custom emojis note with the new markdown
                await app.replaceNoteContent({uuid: customEmojisNote.uuid}, newCustomEmojis);
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
    }, ['refreshTimeout'])
}

export default plugin;
