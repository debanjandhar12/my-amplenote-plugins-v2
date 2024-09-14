import embedHTML from 'inline:./embed/index.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {get} from "lodash-es";

const plugin = {
    noteOption: {
        "Preview mindmap": async function (app) {
            const noteUUID = app.context.noteUUID;
            if (!noteUUID) app.alert('No note selected');
            await app.openSidebarEmbed(1, 'sidebar', noteUUID);
        },
    },
    async onEmbedCall(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);
        switch (commandName) {
            case 'getSettings':
                return { type: 'success', result: app.settings };
            case 'getAppProp':
                const propName = args[0];
                return { type: 'success', result: get(app, propName) };
            case 'navigate':
                const [url] = args;
                if (app.navigate(url)) return { type: 'success' };
                window.open(url, '_blank');
                return { type: 'success' };
            case 'getNoteTitle':
                const [noteUUID] = args;
                return { type: 'success', result: (await app.notes.find(noteUUID)).name };
            case 'saveFile':
                try {
                    let {name, data} = args[0];
                    if (data.startsWith('data:')) { // if data is url, convert to blob
                        const response = await fetch(data);
                        data = await response.blob();
                    }
                    const saved = await app.saveFile(data, name);
                    return { type: 'success', result: saved };
                } catch (e) {
                    return { type: 'error', result: e.message };
                }
            default:
                try {
                    const result = await (get(app, commandName))(...args);
                    return { type: 'success', result: result };
                } catch (error) {
                    return { type: 'error', result: error.message };
                }
        }
    },
    renderEmbed(app, embedType, noteUUID) {
        const htmlWithNoteUUID = addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
        return addWindowVariableToHtmlString(htmlWithNoteUUID, 'appSettings', app.settings);
    }
}

export default plugin;
