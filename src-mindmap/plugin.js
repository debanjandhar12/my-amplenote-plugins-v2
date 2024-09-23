import embedHTML from 'inline:./embed/index.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";

const plugin = {
    noteOption: {
        "Preview mindmap": async function (app) {
            const noteUUID = app.context.noteUUID;
            if (!noteUUID) app.alert('No note selected');
            await app.openSidebarEmbed(1, 'sidebar', noteUUID);
        },
    },
    onEmbedCall: createOnEmbedCallHandler(COMMON_EMBED_COMMANDS),
    renderEmbed(app, embedType, noteUUID) {
        return addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
    }
}

export default plugin;
