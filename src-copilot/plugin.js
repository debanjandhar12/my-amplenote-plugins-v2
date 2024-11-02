import chatHTML from 'inline:./embed/chat.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {syncNotes} from "./pinecone/syncNotes.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
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
        }
    },
    noteOption: {
        "Chat with Copilot": async function (app, noteUUID) {
            try {
                await app.openSidebarEmbed(1, {noteUUID, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed: async function (app, args, source = 'embed') {
        try {
            if (args.openChat) {
                const noteInfo = await app.findNote({uuid: args.noteUUID});
                const dailyJotNote = await app.notes.dailyJot(Math.floor(Date.now() / 1000));
                const dailyJotNoteUUID = (await dailyJotNote.url()).split('/').pop();
                return addWindowVariableToHtmlString(chatHTML, 'userData', {
                    currentNoteUUID: args.noteUUID,
                    currentNoteTitle: noteInfo.name,
                    dailyJotNoteUUID: dailyJotNoteUUID
                });
            }
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS
    })
}

export default plugin;
