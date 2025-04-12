import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {useNoteSelector} from "../hooks/useNoteSelector.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {getLLMModel} from "../../backend/getLLMModel.js";
import {generateText} from "../../backend/generateText.js";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";
import {toCoreMessages} from "@assistant-ui/react";
import {ToolCardCanceledMessage} from "../components/tools-ui/ToolCardCanceledMessage.jsx";
import {ExpandableScrollArea} from "../components/tools-ui/ExpandableScrollArea.jsx";

export const EditNoteContent = () => {
    return createGenericCUDTool({
        toolName: "EditNoteContent",
        description: "Prefer this over UpdateUserNotes when only editing content is required. Do not this tool unless user has specifically asked to modify / edit note content.\n"+
            " For instance, DO NOT call this tool if user is asking to summarize note content. Summarization doesn't mean editing note content.",
        parameters: {
            type: "object",
            properties: {
                noteUUID: {
                    type: "string",
                    description: "36 digit UUID of note"
                },
                editInstruction: {
                    type: "string",
                    description: "Very short instruction on how to modify content."
                }
            },
            required: ["noteUUID"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        renderInit: () => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Generating content...`} icon={<Spinner />} />
        },
        onInit: async ({setFormState, formData, setFormData, args, threadRuntime}) => {
            const noteUUID = args.noteUUID;
            const editInstruction = args.editInstruction;
            const currentContent = await appConnector.getNoteContentByUUID(noteUUID);
            const previousConversationJSON = JSON.stringify(toCoreMessages(threadRuntime.getState().messages));
            const previousConversationString = previousConversationJSON.length > 16000 ?
                previousConversationJSON.substring(previousConversationJSON.length - 16000)
                : previousConversationJSON;
            const model = await getLLMModel(appSettings);
            let newContent = currentContent;
            try {
                if (currentContent.trim() === '') {
                    newContent = (await generateText(model,
                        "<|im_start|>\n" +
                        "Previous conversation history for reference:\n" +
                        previousConversationString +
                        "<|im_end|>\n" +
                        "<|im_start|>\n" +
                        "You are a AI content generator tool. You can use markdown. DO NOT reply anything other than the generated text on provided topic. Instructions:" + "\n" +
                        editInstruction)).text;
                } else {
                    newContent = (await generateText(model,
                "<|im_start|>\n" +
                        "Previous conversation history for reference:\n" +
                        previousConversationString +
                        "<|im_end|>\n" +
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
                        editInstruction +
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
            setFormData({...formData, noteUUID, editInstruction, newContent, currentContent});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({args, formData, setFormData, status, setFormState}) => {
            const [noteSelectionArr, setNoteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID] = useNoteSelector({args, setFormData, formData});
            const { Text } = window.RadixUI;
            const StringDiff = window.StringDiff;
            return (
                <ToolCardContainer>
                    <Text>Update note content:</Text>
                    <ExpandableScrollArea
                        style={{
                            background: "var(--gray-a2)",
                            width: "100%",
                            borderRadius: "8px",
                            minHeight: "100px",
                            maxHeight: "100px",
                            marginTop: "10px",
                            border: "1px solid #ccc",
                            padding: "5px",
                            whiteSpace: "pre-wrap"
                        }}
                    >
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
                    </ExpandableScrollArea>
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
            await appConnector.replaceNoteContent({uuid: selectedNoteUUID}, formData.newContent);
            setFormState("completed");
        },
        onCompleted: async ({formData, addResult, setFormData}) => {
            const noteTitle = await appConnector.getNoteTitleByUUID(formData.currentNoteSelectionUUID);
            setFormData({...formData, noteTitle});
            addResult({resultSummary: `${noteTitle} note content updated.`, newContent: formData.newContent});
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={formData.newContent}
                text={`${formData.noteTitle} note content updated.`}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        },
        renderCanceled: ({formData, toolName, args}) => {
            return <ToolCardCanceledMessage text={`${toolName} tool invocation canceled.`}
                toolName={toolName} input={{note: args.noteUUID, newContent: formData.newContent}} />
        },
        onCanceled: ({addResult, args, formData, cancelFurtherLLMReply}) => {
            addResult("Tool invocation canceled by user. No operation was performed.\n"+
                `Input (canceled): ${JSON.stringify({noteUUID: args.noteUUID, suggestedContent: formData.newContent})}`);
            cancelFurtherLLMReply();
        }
    });
}
