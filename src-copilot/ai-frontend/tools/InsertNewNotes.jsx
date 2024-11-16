import {createGenericMultiInsertTool} from "../tool-helpers/createGenericMultiInsertTool.jsx";

export const InsertNewNotes = () => {
    return createGenericMultiInsertTool({
        toolName: "InsertNewNotes",
        description: "Create new notes in amplenote. ",
        parameters: {
            type: "object",
            properties: {
                notes: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            noteName: {
                                type: "string",
                                minLength: 1,
                                description: "The name of the note."
                            },
                            noteTags: {
                                type: "array",
                                items: {
                                    type: "string"
                                },
                                description: "The tags of the note. (Optional)"
                            },
                            noteContent: {
                                type: "string",
                                description: "The content of the note. (Optional)"
                            }
                        },
                        required: ["noteName"]
                    }
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        itemName: 'notes',
        parameterPathForInsertItemArray: 'notes',
        insertItemFunction: async ({ item }) => {
            const noteUUID = await appConnector.createNote(item.noteName, item.noteTags || []);
            if (!noteUUID) throw new Error('Failed to insert note');
            if (item.noteContent) {
                await appConnector.insertNoteContent({uuid: noteUUID}, item.noteContent);
            }
            return {
                ...item,
                noteUUID
            }
        }
    });
}