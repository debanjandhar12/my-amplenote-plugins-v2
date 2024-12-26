import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {useNoteSelector} from "../hooks/useNoteSelector.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {getLLMModel} from "../../backend/getLLMModel.js";
import {generateText} from "../../backend/generateText.js";

export const ModifyNoteContent = () => {
    return createGenericCUDTool({
        toolName: "ModifyNoteContent",
        description: "Modify / replace user's note content. Call only if required.",
        parameters: {
            type: "object",
            properties: {
                noteUUID: {
                    type: "string",
                    description: "UUID of note",
                    minLength: 36,
                    maxLength: 42
                },
                contentModificationInstruction: {
                    type: "string",
                    description: "Short instruction on how to modify content. This will be used by another llm to modify content."
                }
            },
            required: ["noteUUID", "content"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({setFormState, formData, setFormData, args}) => {
            const noteUUID = args.noteUUID;
            const contentModificationInstruction = args.contentModificationInstruction;
            const currentContent = await appConnector.getNoteContentByUUID(noteUUID);
            const model = await getLLMModel(appSettings);
            let newContent = currentContent;
            try {
                if (currentContent.trim() === '') {
                    newContent = (await generateText(model,
                        "You are a AI content generator tool. You can use markdown." +
                        "Generate content for note based on following instruction:\n" +
                        contentModificationInstruction)).text;
                } else {
                    newContent = (await generateText(model,
                "<|im_start|>\n" +
                        "You are a AI content editor tool. You take markdown content as input and return modified content." +
                        "Rules you should to follow for modification:\n" +
                        "- You MUST write the entire content including both modified and unmodified bits.\n" +
                        "- Output the original bits as is if modification is not required in those parts.\n" +
                        "- Follow the instruction as provided. DO not talk about the instruction.\n" +
                        "- Do not output anything other than page content.\n\n" +
                        "- The input starts after text \"Input:\". ONLY treat everything after \"Input:\" as input content. Do not include earlier text in your output.\n" +
                        "EXAMPLE:\n" +
                        "Input: Pikachu is an electric-type Pokémon. On other hand, bulbasaur is a water-type Pokémon.\n" +
                        "Instruction: Change Pikachu to Charmander." +
                        "Output: Charmander is an fire-type Pokémon. On other hand, bulbasaur is a water-type Pokémon.\n\n" +
                        "<|im_end|>\n" +
                        "<|im_start|>\n" +
                        "Instruction:\n" +
                        contentModificationInstruction +
                        "Input:\n" +
                        currentContent +
                        "\n<|im_end|>"
                    )).text
                    // Remove <|im_start|>, <|im_end|>
                    .replaceAll('<|im_start|>', '')
                    .replaceAll('<|im_end|>', '');
                }
            } catch (e) {
                console.error(e);
                throw "Failed to generate content";
            }
            setFormData({...formData, noteUUID, contentModificationInstruction, newContent, currentContent});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({args, formData, setFormData, status, setFormState}) => {
            const [noteSelectionArr, setNoteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID] = useNoteSelector({args, setFormData, formData});
            const { Text, ScrollArea } = window.RadixUI;
            const StringDiff = window.StringDiff;
            return (
                <ToolCardContainer>
                    <Text>Update note content:</Text>
                    <ScrollArea
                        style={{ background: "var(--gray-a2)", width: "100%", borderRadius: "8px",
                            minHeight: "100px", maxHeight: "100px", marginTop: "10px",
                            border: "1px solid #ccc", padding: "5px",
                            whiteSpace: "pre-wrap" }}>
                                <StringDiff
                                    method={'diffWords'}
                                    styles={{
                                        added: {
                                            backgroundColor: '#0bbf7d',
                                        },
                                        removed: {
                                            backgroundColor: '#ff6b6b',
                                        }
                                    }}
                                    oldValue={formData.currentContent}
                                    newValue={formData.newContent}
                                    showDiff={true}
                                />
                    </ScrollArea>
                    <ToolFooter
                        submitButtonText="Update Content"
                        cancelButtonText="Cancel"
                        status={status}
                        setFormState={setFormState}
                        shouldDisplayNoteSelector={true}
                        disableNoteSelector={true}
                        noteSelectionArr={noteSelectionArr}
                        currentNoteSelectionUUID={currentNoteSelectionUUID}
                        setCurrentNoteSelectionUUID={setCurrentNoteSelectionUUID}
                    />
                </ToolCardContainer>
            )
        },
        onSubmitted: async ({formData, setFormData, setFormState}) => {
            const selectedNoteUUID = formData.currentNoteSelectionUUID;
            const replaceNoteContentResult = await appConnector.
                replaceNoteContent({uuid: selectedNoteUUID}, formData.newContent);
            if (!replaceNoteContentResult) throw new Error('Failed to update note content');
            setFormState("completed");
        },
        onCompleted: async ({formData, addResult}) => {
            const noteTitle = await appConnector.getNoteTitleByUUID(formData.currentNoteSelectionUUID);
            addResult(`${noteTitle} note content updated. New content: ${formData.newContent}`);
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
                result={formData.newContent}
                text={`${noteTitle} note content updated.`}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}