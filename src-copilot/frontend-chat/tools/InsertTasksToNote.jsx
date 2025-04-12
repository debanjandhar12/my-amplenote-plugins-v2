import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {useNoteSelector} from "../hooks/useNoteSelector.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";

export const InsertTasksToNote = () => {
    return createGenericCUDTool({
        toolName: "InsertTasksToNote",
        description: "Create tasks and insert them to note",
        parameters: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    minItems: "1",
                    items: {
                        type: "object",
                        properties: {
                            taskContent: {
                                type: "string",
                                description: "Short description of task"
                            },
                            taskStartAt: {
                                type: "string",
                                description: "Start date and time of the task in ISO format"
                            },
                            taskEndAt: {
                                type: "string",
                                description: "End date and time of the task in ISO format (Optional)"
                            },
                            taskScore: {
                                type: "number",
                                description: "Optional score"
                            }
                        },
                        required: ["taskContent"]
                    }
                },
                noteUUID: {
                    type: "string",
                    description: "36 digit UUID of note to insert the task into."
                }
            },
            required: ["tasks", "noteUUID"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: ({setFormState, formData, setFormData, args}) => {
            setFormData({...formData, tasksContainerList: args.tasks.map((task) => ({
                item: task,
                checked: true,
            }))});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({args, formData, setFormData, status, setFormState}) => {
            const setTasksContainerList = (tasksContainerList) => {
                setFormData({...formData, tasksContainerList});
            };
            const [noteSelectionArr, setNoteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID] = useNoteSelector({args, setFormData, formData});

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select tasks to insert into note:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.tasksContainerList}
                        setItemContainerList={setTasksContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Insert Tasks"
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
        onSubmitted: async ({formData, setFormData, setFormState, addResult, result}) => {
            let lastError = null;
            const selectedItemContainerList = formData.tasksContainerList.filter((item) => item.checked);
            const selectedNoteUUID = formData.currentNoteSelectionUUID;
            const successfulInsertedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await insertTasksToNote({
                            selectedNoteUUID: selectedNoteUUID,
                            item: selectedItemContainer.item
                        })) || selectedItemContainer.item;
                    successfulInsertedItems.push(result);
                } catch (e) {
                    failedItems.push(selectedItemContainer.item);
                    lastError = e;
                    console.error(e);
                }
            }

            if (failedItems.length === selectedItemContainerList.length) {
                const lastErrorMessage = lastError.message || lastError;
                throw "Failed to insert all of the selected tasks. Sample error: " + errorToString(lastErrorMessage);
            }

            setFormData({...formData, successfulInsertedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: async ({formData, addResult}) => {
            const {successfulInsertedItems, failedItems} = formData;
            const lastError = formData.lastError;
            const selectedNoteUUID = formData.currentNoteSelectionUUID;
            const selectedNoteTitle = await appConnector.getNoteTitleByUUID(selectedNoteUUID);
            if (failedItems.length === 0) {
                addResult({resultSummary: `${successfulInsertedItems.length} tasks inserted successfully into note ${selectedNoteTitle} (uuid: ${selectedNoteUUID}).`,
                    resultDetails: successfulInsertedItems});
            } else {
                addResult({resultSummary: `${successfulInsertedItems.length} tasks inserted successfully into note ${selectedNoteTitle} (uuid: ${selectedNoteUUID}).` +
                        `${failedItems.length} tasks failed to insert into note.` +
                        `Error sample: ${errorToString(lastError)}`,
                    resultDetails: successfulInsertedItems, failedResultDetails: failedItems});
            }
        },
        renderCompleted: ({formData, args, toolName}) => {
            const [noteTitle, setNoteTitle] = React.useState(null);
            React.useEffect(() => {
                const fetchNoteTitle = async () => {
                    const title = await appConnector.getNoteTitleByUUID(formData.currentNoteSelectionUUID);
                    setNoteTitle(title);
                };
                fetchNoteTitle();
            }, [formData.currentNoteSelectionUUID]);

            const { CheckboxIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulInsertedItems)}
                text={`${formData.successfulInsertedItems.length} tasks inserted successfully into note ${noteTitle}.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} tasks failed to insert.` : "")}
                icon={<CheckboxIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const insertTasksToNote = async ({ selectedNoteUUID, item }) => {
    const taskUUID = await appConnector.insertTask({uuid: selectedNoteUUID}, {
        content: item.taskContent
    });
    if (!taskUUID) throw new Error('Failed to insert task');
    if (item.taskStartAt) {
        await appConnector.updateTask(taskUUID, {
            startAt: (Date.parse(item.taskStartAt) / 1000) // convert to timestamp
        });
    }
    if (item.taskEndAt) {
        await appConnector.updateTask(taskUUID, {
            endAt: (Date.parse(item.taskEndAt) / 1000) // convert to timestamp
        });
    }
    if (item.taskScore) {
        await appConnector.updateTask(taskUUID, {
            score: item.taskScore
        });
    }
    return {
        ...item,
        taskUUID
    }
}
