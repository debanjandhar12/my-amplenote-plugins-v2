import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";

export const FetchNoteDetailByNoteUUID = () => {
    return createGenericReadTool({
        toolName: "FetchNoteDetailByNoteUUID",
        description: "Get title, backlinks, tags and full content of notes.",
        parameters: {
            type: "object",
            properties: {
                noteUUIDList: {
                    type: "array",
                    items: {
                        type: "string",
                        description: "UUID of note",
                        minLength: 36,
                        maxLength: 36
                    }
                },
                includeContent: {
                    type: "boolean",
                    description: "set true if full content is needed"
                }
            },
            required: ["noteUUIDList"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState, setFormError}) => {
            const noteUUIDList = args.noteUUIDList;
            const noteInfoList = [];
            for (const noteUUID of noteUUIDList) {
                const noteTitle = await appConnector.getNoteTitleByUUID(noteUUID);
                if (!noteTitle) {
                    noteInfoList.push({error: `Note ${noteUUID} not found.`});
                    continue;
                }
                let noteContent = null;
                if (args.includeContent) {
                    noteContent = await appConnector.getNoteContentByUUID(noteUUID);
                    if (noteContent.length > 8000) {
                        noteContent = noteContent.trim().substring(0, 8000) + "<<too long to display>>...";
                    }
                }
                const backlinks = await appConnector.getNoteBacklinksByUUID({uuid: noteUUID});
                const tags = await appConnector.getNoteTagsByUUID({uuid: noteUUID});
                noteInfoList.push({noteUUID, noteTitle, tags, backlinks, noteContent});
            }
            if (noteInfoList.every(noteInfo => noteInfo.error)) {
                setFormError(new Error("Failed to fetch all notes. Sample error: " + noteInfoList[0].error));
            }
            setFormData({...formData, noteInfoList});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {noteInfoList} = formData;
            addResult(`Fetched note info. Details: ${JSON.stringify(noteInfoList)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.noteInfoList)}
                                              text={`Note info fetched successfully.`}/>
        }
    });
}