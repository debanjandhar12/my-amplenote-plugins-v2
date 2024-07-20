import embedHTML from './embed/index.html?inline';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    noteOption: {
        "Open as Mindmap": async function (app) {
            const noteUUID = app.context.noteUUID;
            if (!noteUUID) app.alert('No note selected');
            await app.openSidebarEmbed(1, noteUUID);
        },
    },
    async onEmbedCall(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);
        switch (commandName) {
            case 'getNoteContent': {
                const [noteUUID] = args;
                return app.getNoteContent({uuid: noteUUID});
            }
            case 'navigate': {
                const [url] = args;
                if (app.navigate(url)) return;
                window.open(url, '_blank');
                break;
            }
            case 'getNoteTitle': {
                const [noteUUID] = args;
                return (await app.notes.find(noteUUID)).name;
            }
            default:
                console.log('Unknown command: ' + commandName);
        }
    },
    renderEmbed(app, noteUUID) {
        return addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
    }
}

export default plugin;
