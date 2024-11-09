import chatHTML from 'inline:./embed/chat.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {syncNotes} from "./pinecone/syncNotes.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    currentNoteUUID: null,
    insertText: {
        "Continue": async function (app) {
            try {
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    appOption: {
        "Sync notes to pinecone": async function (app) {
            try {
                await syncNotes(app);
                await app.alert("Sync completed");
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Chat with Copilot": async function (app) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'appOption', openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    replaceText: {
        "Chat with Copilot": async function (app, selectionContent) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'replaceSelection', selectionContent: app?.context?.selectionContent || selectionContent, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    noteOption: {
        "Chat with Copilot": async function (app, noteUUID) {
            try {
                plugin.currentNoteUUID = noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'noteOption', noteUUID, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    imageOption: {
        "Chat with Copilot": async function (app, image) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'imageOption', image, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed: async function (app, args, source = 'embed') {
        try {
            if (args.openChat) {
                let userData = {};
                if (args.trigger === 'noteOption') {
                    const noteInfo = await app.findNote({uuid: args.noteUUID});
                    userData = {...userData, invokerNoteUUID: args.noteUUID, invokerNoteTitle: noteInfo.name};
                } else if (args.trigger === 'imageOption') {
                    userData = {...userData, invokerImageSrc: args.image.src};
                } else if (args.trigger === 'replaceSelection') {
                    userData = {...userData, invokerSelectionContent: args.selectionContent};
                }
                const dailyJotNote = await app.notes.dailyJot(Math.floor(Date.now() / 1000));
                const dailyJotNoteUUID = (await dailyJotNote.url()).split('/').pop();
                userData = {...userData, dailyJotNoteUUID: dailyJotNoteUUID};
                return addWindowVariableToHtmlString(chatHTML, 'userData', userData);
            }
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        "getUserCurrentNoteData": async (app) => {
            try {
                const currentNoteUUID = app.context.noteUUID || plugin.currentNoteUUID;
                const currentNote = await app.findNote({uuid: currentNoteUUID});
                return {
                    currentNoteUUID: currentNote.uuid,
                    currentNoteTitle: currentNote.name
                }
            } catch (e) {
                throw 'Failed getUserCurrentNoteData - ' + e;
            }
        }
    })
}

export default plugin;
