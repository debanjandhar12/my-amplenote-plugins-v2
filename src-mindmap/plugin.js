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
    onEmbedCall(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);
        switch (commandName) {
            case 'getNoteContent':
                const [noteUUID] = args;
                return app.getNoteContent({ uuid: noteUUID });
            case 'navigate':
                const [url] = args;
                // These two lines may be buggy
                if(app.navigate(url)) return;
                window.open(url, '_blank');
                break;
            default:
                console.log('Unknown command: ' + commandName);
        }
    },
    renderEmbed(app, noteUUID) {
        console.log(embedHTML, addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID));
        return addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
    }
}

export default plugin;
