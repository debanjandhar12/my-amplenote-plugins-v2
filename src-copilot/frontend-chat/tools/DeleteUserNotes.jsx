import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {errorToString} from "../helpers/errorToString.js";
import {LLM_API_URL_SETTING} from "../../constants.js";

export const DeleteUserNotes = () => {
    return createGenericCUDTool({
        toolName: "DeleteUserNotes",
        description: "Delete user notes",
        parameters: {
            type: "object",
            properties: {
                notes: {
                    type: "array",
                    minItems: window.appSettings[LLM_API_URL_SETTING].includes('googleapis') ? "1" : 1,
                    items: {
                        type: "object",
                        properties: {
                            noteUUID: {
                                type: "string",
                                description: "36 digit UUID of the note to delete"
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
            if (failedItems.length === 0) {
                addResult({resultSummary: `${successfulDeletedItems.length} notes deleted successfully.`,
                    resultDetail: successfulDeletedItems});
            } else {
                addResult({resultSummary: `${successfulDeletedItems.length} notes deleted successfully. ` +
                        `${failedItems.length} notes failed to delete. ` +
                        `Error sample: ${errorToString(lastError)}`,
                    resultDetail: successfulDeletedItems, failedResultDetail: failedItems});
            }
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulDeletedItems)}
                text={`${formData.successfulDeletedItems.length} notes deleted successfully.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} notes failed to delete.` : "")}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    })
}

const deleteNote = async ({ noteUUID }) => {
    return await appConnector.deleteNote({uuid: noteUUID});
}
