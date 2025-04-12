import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {LLM_API_URL_SETTING} from "../../constants.js";

export const UpdateUserTasks = () => {
    return createGenericCUDTool({
        toolName: "UpdateUserTasks",
        description: "Update user tasks",
        parameters: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    minItems: window.appSettings[LLM_API_URL_SETTING].includes('googleapis') ? "1" : 1,
                    items: {
                        type: "object",
                        properties: {
                            taskUUID: {
                                type: "string",
                                description: "UUID of the task to update"
                            },
                            taskContent: {
                                type: "string",
                                description: "Short task content"
                            },
                            taskStartAt: {
                                type: "string",
                                description: "ISO format start date and time of the task"
                            },
                            taskEndAt: {
                                type: "string",
                                description: "ISO format end date and time of the task"
                            },
                            completedAt: {
                                type: "string",
                                description: "ISO format completed date and time of the task." +
                                    "Set to current time to toogle task as completed and null to toggle as uncompleted."
                            },
                            dismissedAt: {
                                type: "string",
                                description: "ISO format dismissed date and time of the task." +
                                    "Set to current time to toogle task as dismissed and null to toggle as undismissed."
                            },
                            hideUntil: {
                                type: "string",
                                description: "ISO format hide until date and time of the task."
                            },
                            taskScore: {
                                type: "number"
                            },
                            important: {
                                type: "boolean"
                            },
                            urgent: {
                                type: "boolean"
                            }
                        },
                        required: ["taskUUID"]
                    }
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({setFormState, formData, setFormData, args}) => {
            const tasksContainerList = [];
            for (const taskItem of args.tasks) {
                const taskUUID = taskItem.taskUUID;
                const taskContent = taskItem.taskContent;
                const taskStartAt = taskItem.taskStartAt;
                const taskEndAt = taskItem.taskEndAt;
                const completedAt = taskItem.completedAt;
                const dismissedAt = taskItem.dismissedAt;
                const hideUntil = taskItem.hideUntil;
                const taskScore = taskItem.taskScore;
                const important = taskItem.important;
                const urgent = taskItem.urgent;
                tasksContainerList.push({
                    item: {
                        uuid: taskUUID,
                        content: taskContent,
                        startAt: taskStartAt,
                        endAt: taskEndAt,
                        completedAt: completedAt,
                        dismissedAt: dismissedAt,
                        hideUntil: hideUntil,
                        score: taskScore,
                        important: important,
                        urgent: urgent,
                    },
                    checked: true,
                });
            }
            const oldTasksContainerList = [];
            for (const taskItem of args.tasks) {
                const taskUUID = taskItem.taskUUID;
                const task = await appConnector.getTask(taskUUID);
                if (!task) throw new Error(`Task ${taskUUID} not found.`);
                oldTasksContainerList.push({
                    item: {
                        uuid: taskUUID,
                        content: task.content,
                        startAt: task.startAt,
                        endAt: task.endAt,
                        completedAt: task.completedAt,
                        dismissedAt: task.dismissedAt,
                        hideUntil: task.hideUntil,
                        score: task.score,
                        important: task.important,
                        urgent: task.urgent,
                    },
                });
            }
            setFormData({...formData, tasksContainerList, oldTasksContainerList});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({formData, setFormData, status, setFormState}) => {
            const setTasksContainerList = (tasksContainerList) => {
                setFormData({...formData, tasksContainerList});
            };

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select tasks to update:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.tasksContainerList}
                        setItemContainerList={setTasksContainerList}
                        oldItemContainerList={formData.oldTasksContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Update Tasks"
                        cancelButtonText="Cancel"
                        status={status}
                        setFormState={setFormState}
                    />
                </ToolCardContainer>
            )
        },
        onSubmitted: async ({formData, setFormData, setFormError, setFormState, addResult, result}) => {
            let lastError = null;
            const selectedItemContainerList = formData.tasksContainerList.filter((item) => item.checked);
            const successfulUpdatedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await updateTask({
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
                throw "Failed to update all of the selected tasks. Sample error: " + errorToString(lastError);
            }
            setFormData({...formData, successfulUpdatedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            const {successfulUpdatedItems, failedItems} = formData;
            const lastError = formData.lastError;
            if (failedItems.length === 0) {
                addResult({resultSummary: `${successfulUpdatedItems.length} tasks updated successfully.`,
                    resultDetail: successfulUpdatedItems});
            } else {
                addResult({
                    resultSummary: `${successfulUpdatedItems.length} tasks updated successfully. ` +
                        `${failedItems.length} tasks failed to update. ` +
                        `Error sample: ${errorToString(lastError)}`,
                    resultDetail: successfulUpdatedItems, failedResultDetail: failedItems
                });
            }
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { CheckboxIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulUpdatedItems)}
                text={`${formData.successfulUpdatedItems.length} tasks updated successfully.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} tasks failed to update.` : "")}
                icon={<CheckboxIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const updateTask = async ({ item }) => {
    const oldTaskContent = await appConnector.getTask(item.uuid).then(task => task.content);
    if (item.taskContent && item.taskContent !== oldTaskContent) {
        await appConnector.updateTask(item.uuid, {
            content: item.taskContent
        });
    }
    if (item.taskStartAt) {
        await appConnector.updateTask(item.uuid, {
            startAt: (Date.parse(item.taskStartAt) / 1000) // convert to timestamp
        });
    }
    if (item.taskEndAt) {
        await appConnector.updateTask(item.uuid, {
            endAt: (Date.parse(item.taskEndAt) / 1000) // convert to timestamp
        });
    }
    if (item.completedAt) {
        await appConnector.updateTask(item.uuid, {
            completedAt: (Date.parse(item.completedAt) / 1000) // convert to timestamp
        });
    }
    if (item.dismissedAt) {
        await appConnector.updateTask(item.uuid, {
            dismissedAt: (Date.parse(item.dismissedAt) / 1000) // convert to timestamp
        });
    }
    if (item.hideUntil) {
        await appConnector.updateTask(item.uuid, {
            hideUntil: (Date.parse(item.hideUntil) / 1000) // convert to timestamp
        });
    }
    if (item.taskScore) {
        await appConnector.updateTask(item.uuid, {
            score: item.taskScore
        });
    }
    if (item.important) {
        await appConnector.updateTask(item.uuid, {
            important: item.important
        });
    }
    if (item.urgent) {
        await appConnector.updateTask(item.uuid, {
            urgent: item.urgent
        });
    }
}
