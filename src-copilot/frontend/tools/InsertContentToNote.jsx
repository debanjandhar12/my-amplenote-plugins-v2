import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {useNoteSelector} from "../hooks/useNoteSelector.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";

export const InsertContentToNote = () => {
    return createGenericCUDTool({
        toolName: "InsertContentToNote",
        description: "Insert markdown content to note. Call only if asked to do so.",
        parameters: {
            type: "object",
            properties: {
                noteUUID: {
                    type: "string",
                    description: "UUID of note",
                    minLength: 36,
                    maxLength: 42
                },
                content: {
                    type: "string",
                    description: "Markdown content to insert"
                }
            },
            required: ["noteUUID", "content"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({setFormState, formData, setFormData, args}) => {
            const noteUUID = args.noteUUID;
            const content = args.content;
            setFormData({...formData, noteUUID, content});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({args, formData, setFormData, status, setFormState}) => {
            const [noteSelectionArr, setNoteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID] = useNoteSelector({args, setFormData, formData});
            const { Text, TextArea } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select note to insert content into:</Text>
                    <TextArea
                        value={formData.content}
                        disabled={true}
                        style={{ width: "100%", minHeight: "100px", maxHeight: "100px", marginTop: "10px" }}
                        />
                    <ToolFooter
                        submitButtonText="Insert Content"
                        cancelButtonText="Cancel"
                        status={status}
                        setFormState={setFormState}
                        shouldDisplayNoteSelector={true}
                        noteSelectionArr={noteSelectionArr}
                        currentNoteSelectionUUID={currentNoteSelectionUUID}
                        setCurrentNoteSelectionUUID={setCurrentNoteSelectionUUID}
                    />
                </ToolCardContainer>
            )
        },
        onSubmitted: async ({formData, setFormData, setFormState}) => {
            const selectedNoteUUID = formData.currentNoteSelectionUUID;
            const insertContentToNoteResult =
                (await insertContentToNote({
                    selectedNoteUUID: selectedNoteUUID,
                    content: formData.content
                })) || selectedNoteUUID;
            setFormData({...formData, insertContentToNoteResult});
            setFormState("completed");
        },
        onCompleted: async ({formData, addResult}) => {
            const noteTitle = await appConnector.getNoteTitleByUUID(formData.currentNoteSelectionUUID);
            addResult(`Content inserted successfully to note ${noteTitle} (uuid: ${formData.currentNoteSelectionUUID}).`);
        },
        renderCompleted: ({formData, toolName, args}) => {
            const [noteTitle, setNoteTitle] = React.useState(null);
            React.useEffect(() => {
                const fetchNoteTitle = async () => {
                    const title = await appConnector.getNoteTitleByUUID(formData.currentNoteSelectionUUID);
                    setNoteTitle(title);
                };
                fetchNoteTitle();
            }, [formData.currentNoteSelectionUUID]);

            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={formData.content}
                text={`Content inserted successfully to note ${noteTitle} (uuid: ${formData.currentNoteSelectionUUID})`}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const insertContentToNote = async ({ selectedNoteUUID, content }) => {
    return await appConnector.insertNoteContent({uuid: selectedNoteUUID}, content, {atEnd: true});
}