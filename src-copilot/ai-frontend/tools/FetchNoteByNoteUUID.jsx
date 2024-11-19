import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";

export const FetchNoteByNoteUUID = () => {
    return createGenericReadTool({
        toolName: "FetchNoteByNoteUUID",
        description: "Call this to get the title, content, backlinks, and tags of a note.",
        parameters: {
            type: "object",
            properties: {
                noteUUID: {
                    type: "string",
                    description: "UUID of note",
                    minLength: 1,
                }
            },
            required: ["noteUUID"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState}) => {
            const noteUUID = args.noteUUID;
            const noteContent = await appConnector.getNoteContentByUUID(args.noteUUID);
            const noteTitle = await appConnector.getNoteTitleByUUID(args.noteUUID);
            const backlinks = await appConnector.getNoteBacklinksByUUID({uuid: args.noteUUID});
            const tags = await appConnector.getNoteTagsByUUID({uuid: args.noteUUID});
            setFormData({...formData, noteInfo: {noteUUID, noteTitle, tags, backlinks, noteContent: noteContent.trim().substring(0, 8000)}});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {noteInfo} = formData;
            addResult(`Fetched note info. Details: ${JSON.stringify(noteInfo)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.noteInfo)}
                                              text={`Note info fetched successfully.`}/>
        }
    });
}