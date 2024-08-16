import embedHTML from './embed/index.html?inline';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

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
            case 'getAdditionalOptionSelection': {
                const result = app.prompt("", {
                    inputs: [
                        { label: "Select an option", type: "select", options: [
                                { label: "Expand all nodes recursively", value: "Expand all nodes recursively" },
                                { label: "Collapse all nodes recursively", value: "Collapse all nodes recursively" },
                                { label: "Save as png image", value: "Save as png image" }
                            ], value: "Expand all nodes recursively"
                        }
                    ]
                });
                return result;
            }
            case 'saveFile': {
                let {name, data} = args[0];
                if (data.startsWith('data:')) { // if data is url, convert to blob
                    const response = await fetch(data);
                    data = await response.blob();
                }
                return app.saveFile(data, name);
            }
            default:
                console.log('Unknown command: ' + commandName);
        }
    },
    renderEmbed(app, embedType, noteUUID) {
        const htmlWithNoteUUID = addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
        return addWindowVariableToHtmlString(htmlWithNoteUUID, 'appSettings', app.settings);
    }
}

export default plugin;
