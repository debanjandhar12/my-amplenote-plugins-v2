import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {errorToString} from "../helpers/errorToString.js";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {LLM_API_URL_SETTING} from "../../constants.js";

export const UpdateUserNotes = () => {
    return createGenericCUDTool({
        toolName: "UpdateUserNotes",
        description: "Update user notes",
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
                                description: "36 digit UUID of the note to update"
                            },
                            noteTitle: {
                                type: "string",
                                description: "New title"
                            },
                            noteContent: {
                                type: "string",
                                description: "New content"
                            },
                            tags: {
                                type: "array",
                                items: {
                                    type: "string"
                                },
                                description: "New tag list (all old tags will be removed - set null to keep old tags)"
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
            if (failedItems.length === 0) {
                addResult({resultSummary: `${successfulUpdatedItems.length} notes updated successfully.`,
                    resultDetail: successfulUpdatedItems});
            } else {
                addResult({
                    resultSummary: `${successfulUpdatedItems.length} notes updated successfully. ` +
                        `${failedItems.length} notes failed to update. ` +
                        `Error sample: ${errorToString(lastError)}`,
                    resultDetail: successfulUpdatedItems, failedResultDetail: failedItems
                });
            }
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { FileTextIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulUpdatedItems)}
                text={`${formData.successfulUpdatedItems.length} notes updated successfully.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} notes failed to update.` : "")}
                icon={<FileTextIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const updateNote = async ({ item }) => {
    const oldNoteTitle = await appConnector.getNoteTitleByUUID(item.uuid);
    if (item.title && item.title !== oldNoteTitle) {
        await appConnector.setNoteName({uuid: item.uuid}, item.title);
    }
    if (item.content) {
        await appConnector.replaceNoteContent({uuid: item.uuid}, item.content);
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
