import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {errorToString} from "../helpers/errorToString.js";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {LLM_API_URL_SETTING} from "../../constants.js";

export const UpdateUserTasks = () => {
    return createGenericCUDTool({
        toolName: "UpdateUserTasks",
        description: "Update tasks",
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
                            content: {
                                type: "string",
                                description: "Task content"
                            },
                            startAt: {
                                type: "string",
                                description: "ISO start datetime"
                            },
                            endAt: {
                                type: "string",
                                description: "ISO end datetime"
                            },
                            completedAt: {
                                type: "string",
                                description: "ISO completed datetime. Set to current time to mark completed, null to mark uncompleted."
                            },
                            dismissedAt: {
                                type: "string",
                                description: "ISO dismissed date/time. Set to current time to mark dismissed, null to mark undismissed."
                            },
                            hideUntil: {
                                type: "string",
                                description: "ISO hide until date/time"
                            },
                            score: {
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
        group: "tasks",
        onInit: async ({setFormState, formData, setFormData, args}) => {
            if (!args.tasks || !Array.isArray(args.tasks)) {
                throw new Error('Invalid arguments: tasks must be an array');
            }
            const tasksContainerList = [];
            for (const taskItem of args.tasks) {
                const item = { uuid: taskItem.taskUUID };
                if ('content' in taskItem) item.content = taskItem.content;
                if ('startAt' in taskItem) item.startAt = taskItem.startAt;
                if ('endAt' in taskItem) item.endAt = taskItem.endAt;
                if ('completedAt' in taskItem) item.completedAt = taskItem.completedAt;
                if ('dismissedAt' in taskItem) item.dismissedAt = taskItem.dismissedAt;
                if ('hideUntil' in taskItem) item.hideUntil = taskItem.hideUntil;
                if ('score' in taskItem) item.score = taskItem.score;
                if ('important' in taskItem) item.important = taskItem.important;
                if ('urgent' in taskItem) item.urgent = taskItem.urgent;

                tasksContainerList.push({
                    item,
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
                        startAt: typeof task.startAt === 'number' ? window.dayjs(task.startAt*1000).format() : null,
                        endAt: typeof task.endAt === 'number' ? window.dayjs(task.endAt*1000).format() : null,
                        completedAt: typeof task.completedAt === 'number' ? window.dayjs(task.completedAt*1000).format() : null,
                        dismissedAt: typeof task.dismissedAt === 'number' ? window.dayjs(task.dismissedAt*1000).format() : null,
                        hideUntil: typeof task.hideUntil === 'number' ? window.dayjs(task.hideUntil*1000).format() : null,
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
    if (!item.uuid) throw new Error('Task UUID is required.');
    console.log('taskupdateobj', item);
    if ('content' in item && item.content !== oldTaskContent) {
        await appConnector.updateTask(item.uuid, {
            content: item.content
        });
    }
    if ('startAt' in item) {
        await appConnector.updateTask(item.uuid, {
            startAt: item.startAt ? (Date.parse(item.startAt) / 1000) : null
        });
    }
    if ('endAt' in item) {
        await appConnector.updateTask(item.uuid, {
            endAt: item.endAt ? (Date.parse(item.endAt) / 1000) : null
        });
    }
    if ('completedAt' in item) {
        await appConnector.updateTask(item.uuid, {
            completedAt: item.completedAt ? (Date.parse(item.completedAt) / 1000) : null
        });
    }
    if ('dismissedAt' in item) {
        await appConnector.updateTask(item.uuid, {
            dismissedAt: item.dismissedAt ? (Date.parse(item.dismissedAt) / 1000) : null
        });
    }
    if ('hideUntil' in item) {
        await appConnector.updateTask(item.uuid, {
            hideUntil: item.hideUntil ? (Date.parse(item.hideUntil) / 1000) : null
        });
    }
    if ('score' in item) {
        await appConnector.updateTask(item.uuid, {
            score: item.score
        });
    }
    if ('important' in item) {
        await appConnector.updateTask(item.uuid, {
            important: item.important
        });
    }
    if ('urgent' in item) {
        await appConnector.updateTask(item.uuid, {
            urgent: item.urgent
        });
    }
}
