import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";

export const CreateNewNotes = () => {
    return createGenericCUDTool({
        toolName: "CreateNewNotes",
        description: "Create new notes in amplenote",
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
                                minLength: 1
                            },
                            noteTags: {
                                type: "array",
                                items: {
                                    type: "string"
                                }
                            },
                            noteContent: {
                                type: "string"
                            }
                        },
                        required: ["noteName"]
                    }
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: ({setFormState, formData, setFormData, args}) => {
            setFormData({...formData, notesContainerList: args.notes.map((note) => ({
                item: note,
                checked: true,
            }))});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({args, formData, setFormData, status, setFormState}) => {
            const setNotesContainerList = (notesContainerList) => {
                setFormData({...formData, notesContainerList});
            };

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select notes to create:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.notesContainerList}
                        setItemContainerList={setNotesContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Create Notes"
                        cancelButtonText="Cancel"
                        status={status}
                        setFormState={setFormState}
                    />
                </ToolCardContainer>
            )
        },
        onSubmitted: async ({formData, setFormData, setFormError, setFormState, addResult, result}) => {
            let lastError = null;
            const selectedItemContainerList = formData.notesContainerList.filter((item) => item.checked);
            const successfulCreatedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await createNote({
                            item: selectedItemContainer.item
                        })) || selectedItemContainer.item;
                    successfulCreatedItems.push(result);
                } catch (e) {
                    failedItems.push(selectedItemContainer.item);
                    lastError = e;
                    console.error(e);
                }
            }

            if (failedItems.length === selectedItemContainerList.length) {
                throw "Failed to create all items. Sample error: " + errorToString(lastError);
            }

            setFormData({...formData, successfulCreatedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            const {successfulCreatedItems, failedItems} = formData;
            const lastError = formData.lastError;
            let resultText = `${successfulCreatedItems.length} notes created successfully.
                Details: ${JSON.stringify(successfulCreatedItems)}`;
            if (failedItems.length > 0) {
                resultText += `\n${failedItems.length} notes failed to create.
                    Details: ${JSON.stringify(failedItems)}\n
                    Error sample: ${errorToString(lastError)}`;
            }
            addResult(resultText);
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulCreatedItems)}
                text={`${formData.successfulCreatedItems.length} notes created successfully.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} notes failed to create.` : "")}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const createNote = async ({ item }) => {
    const noteUUID = await appConnector.createNote(item.noteName, item.noteTags || []);
    if (!noteUUID) throw new Error('Failed to create note');
    if (item.noteContent) {
        await appConnector.insertNoteContent({uuid: noteUUID}, item.noteContent);
    }
    return {
        ...item,
        noteUUID
    }
}