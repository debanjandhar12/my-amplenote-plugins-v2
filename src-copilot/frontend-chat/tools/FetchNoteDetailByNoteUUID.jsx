import { ToolCardResultMessage } from "../components/tools-ui/ToolCardResultMessage.jsx";
import { createGenericReadTool } from "../tools-core/base/createGenericReadTool.jsx";
import { ToolCardMessage } from "../components/tools-ui/ToolCardMessage.jsx";
import { MAX_TOOL_RESULT_LENGTH3 } from "../../constants.js";

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
                        description: "36 digit UUID of note"
                    }
                },
                includeContent: {
                    type: "boolean",
                    description: "set true if full content is needed"
                }
            },
            required: ["noteUUIDList"]
        },
        group: "notes",
        onInit: async ({args, formData, setFormData, setFormState}) => {
            const noteUUIDList = args.noteUUIDList;
            const noteInfoList = [];
            for (const noteUUID of noteUUIDList) {
                const noteTitle = await appConnector.getNoteTitleByUUID(noteUUID);
                if (!noteTitle) {
                    noteInfoList.push({error: `Note ${noteUUID} not found.`});
                    continue;
                }
                const backlinks = await appConnector.getNoteBacklinksByUUID({uuid: noteUUID});
                const tags = await appConnector.getNoteTagsByUUID({uuid: noteUUID});
                const noteInfo = {noteUUID, noteTitle, tags, backlinks};
                if (args.includeContent) {
                    noteInfo.noteContent = await appConnector.getNoteContentByUUID(noteUUID);
                }
                noteInfoList.push(noteInfo);
            }
            if (noteInfoList.every(noteInfo => noteInfo.error)) {
                throw new Error("Failed to fetch all notes. Sample error: " + noteInfoList[0].error);
            }
            setFormData({...formData, noteInfoList});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {noteInfoList} = formData;
            addResult({resultSummary: `Note info fetched successfully.`, resultDetail: noteInfoList}, MAX_TOOL_RESULT_LENGTH3);
        },
        renderInit: ({args}) => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Fetching note details...`} icon={<Spinner />} />
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.noteInfoList)}
                text={`Note info fetched successfully.`}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}
