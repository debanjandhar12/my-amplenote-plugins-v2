import {createGenericCUDTool} from "../tool-helpers/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/ToolFooter.jsx";
import {ItemSelectionTable} from "../components/ItemSelectionTable.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {errorToString} from "../utils/errorToString.js";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const UpdateUserNotes = () => {
    return createGenericCUDTool({
        toolName: "UpdateUserNotes",
        description: "Update user notes",
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
                                description: "UUID of the note to update",
                                minLength: 10
                            },
                            noteTitle: {
                                type: "string",
                                description: "New note title"
                            },
                            noteContent: {
                                type: "string",
                                description: "New note content"
                            },
                            tags: {
                                type: "array",
                                items: {
                                    type: "string"
                                },
                                description: "New tag list for note (all old tags will be removed - set null to keep old tags)"
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
                // Always get title if not provided so that it can be displayed to User
                const noteTitle = noteItem.noteTitle || await appConnector.getNoteTitleByUUID(noteUUID);
                const noteTags = noteItem.tags;
                const noteContent = noteItem.noteContent;
                notesContainerList.push({
                    item: {
                        uuid: noteUUID,
                        title: noteTitle,
                        tags: noteTags,
                        content: noteContent,
                    },
                    checked: true,
                });
            }
            const oldNotesContainerList = [];
            for (const noteItem of args.notes) {
                const noteUUID = noteItem.noteUUID;
                const noteTitle = await appConnector.getNoteTitleByUUID(noteUUID);
                const noteTags = await appConnector.getNoteTagsByUUID({uuid: noteUUID});
                const noteContent = await appConnector.getNoteContentByUUID(noteUUID);
                if (!noteTitle) throw new Error(`Note ${noteUUID} not found.`);
                oldNotesContainerList.push({
                    item: {
                        uuid: noteUUID,
                        title: noteTitle,
                        tags: noteTags,
                        content: noteContent,
                    }
                });
            }
            setFormData({...formData, notesContainerList, oldNotesContainerList});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({formData, setFormData, status, setFormState}) => {
            const setNotesContainerList = (notesContainerList) => {
                setFormData({...formData, notesContainerList});
            };

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select notes to update:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.notesContainerList}
                        setItemContainerList={setNotesContainerList}
                        oldItemContainerList={formData.oldNotesContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Update Notes"
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
            const successfulUpdatedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await updateNote({
                            item: selectedItemContainer.item
                        })) || selectedItemContainer.item;
                    successfulUpdatedItems.push(result);
                } catch (e) {
                    failedItems.push(selectedItemContainer.item);
                    lastError = e;
                    console.error(e);
                }
            }

            if (failedItems.length === selectedItemContainerList.length) {
                throw "Failed to update all of the selected notes. Sample error: " + errorToString(lastError);
            }
            setFormData({...formData, successfulUpdatedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            const {successfulUpdatedItems, failedItems} = formData;
            const lastError = formData.lastError;
            let resultText = `${successfulUpdatedItems.length} notes updated successfully.
                Details: ${JSON.stringify(successfulUpdatedItems)}`;
            if (failedItems.length > 0) {
                resultText += `\n${failedItems.length} notes failed to update.
                    Details: ${JSON.stringify(failedItems)}\n
                    Error sample: ${errorToString(lastError)}`;
            }
            addResult(resultText);
        },
        renderCompleted: ({formData}) => {
            return (
                <ToolCardMessageWithResult result={JSON.stringify(formData.successfulUpdatedItems)}
                                           text={`${formData.successfulUpdatedItems.length} notes updated successfully.` +
                                               (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} notes failed to update.` : "")}
                />
            )
        }
    });
}

const updateNote = async ({ item }) => {
    const oldNoteTitle = await appConnector.getNoteTitleByUUID(item.uuid);
    if (item.noteTitle && item.noteTitle !== oldNoteTitle) {
        await appConnector.setNoteName(item.uuid, item.noteTitle);
    }
    if (item.noteContent) {
        await appConnector.replaceNoteContent({uuid: item.uuid}, item.noteContent);
    }
    if (item.tags) {
        const oldTags = await appConnector.getNoteTagsByUUID({uuid: item.uuid});
        for (const tag of item.tags) {
            if (!oldTags.includes(tag)) {
                await appConnector.addNoteTag({uuid: item.uuid}, tag);
            }
        }
        for (const tag of oldTags) {
            if (!item.tags.includes(tag)) {
                await appConnector.removeNoteTag({uuid: item.uuid}, tag);
            }
        }
    }
}