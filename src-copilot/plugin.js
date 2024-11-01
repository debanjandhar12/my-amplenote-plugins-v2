import chatHTML from 'inline:./embed/chat.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {syncNotes} from "./pinecone/syncNotes.js";

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
    renderEmbed(app, args, source = 'embed') {
        try {
            return chatHTML;
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
