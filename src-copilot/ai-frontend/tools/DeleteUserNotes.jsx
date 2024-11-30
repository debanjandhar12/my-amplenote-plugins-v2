import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {ItemSelectionTable} from "../components/ItemSelectionTable.jsx";
import {ToolFooter} from "../components/ToolFooter.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {createGenericCUDTool} from "../tool-helpers/createGenericCUDTool.jsx";
import {errorToString} from "../utils/errorToString.js";

export const DeleteUserNotes = () => {
    return createGenericCUDTool({
        toolName: "DeleteUserNotes",
        description: "Delete user notes",
        parameters: {
            type: "object",
            properties: {
                notes: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            noteUUID: {
                                type: "string",
                                description: "UUID of the note to delete",
                                minLength: 36,
                                maxLength: 42
                            }
                        },
                        required: ["noteUUID"]
                    }
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({setFormState, formData, setFormData, args}) => {
            const notesContainerList = [];
            for (const noteItem of args.notes) {
                const noteUUID = noteItem.noteUUID;
                const noteTitle = await appConnector.getNoteTitleByUUID(noteUUID);
                if (!noteTitle) throw new Error(`Note ${noteUUID} not found.`);
                const noteTags = await appConnector.getNoteTagsByUUID({uuid: noteUUID});
                notesContainerList.push({
                    item: {
                        uuid: noteUUID,
                        title: noteTitle,
                        tags: noteTags,
                    },
                    checked: true,
                });
            }
            setFormData({...formData, notesContainerList});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({formData, setFormData, status, setFormState}) => {
            const setNotesContainerList = (notesContainerList) => {
                setFormData({...formData, notesContainerList});
            };

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select notes to delete:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.notesContainerList}
                        setItemContainerList={setNotesContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Delete Notes"
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
            const successfulDeletedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await deleteNote({
                            noteUUID: selectedItemContainer.item.uuid
                        })) || selectedItemContainer.item;
                    successfulDeletedItems.push(result);
                } catch (e) {
                    failedItems.push(selectedItemContainer.item);
                    lastError = e;
                    console.error(e);
                }
            }

            if (failedItems.length === selectedItemContainerList.length) {
                throw "Failed to delete all of the selected notes. Sample error: " + errorToString(lastError);
            }
            setFormData({...formData, successfulDeletedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            const {successfulDeletedItems, failedItems} = formData;
            const lastError = formData.lastError;
            let resultText = `${successfulDeletedItems.length} notes deleted successfully.
                Details: ${JSON.stringify(successfulDeletedItems)}`;
            if (failedItems.length > 0) {
                resultText += `\n${failedItems.length} notes failed to delete.
                    Details: ${JSON.stringify(failedItems)}\n
                    Error sample: ${errorToString(lastError)}`;
            }
            addResult(resultText);
        },
        renderCompleted: ({formData}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardMessageWithResult result={JSON.stringify(formData.successfulDeletedItems)}
                                           text={`${formData.successfulDeletedItems.length} notes deleted successfully.` +
                                               (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} notes failed to delete.` : "")}
                                           icon={<FileTextIcon />} />
        }
    })
}

const deleteNote = async ({ noteUUID }) => {
    return await appConnector.deleteNote({uuid: noteUUID});
}