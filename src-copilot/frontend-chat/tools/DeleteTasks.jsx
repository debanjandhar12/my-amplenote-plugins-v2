import {createGenericCUDTool} from "../tools-core/base/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/tools-ui/ToolFooter.jsx";
import {ItemSelectionTable} from "../components/tools-ui/ItemSelectionTable.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {errorToString} from "../helpers/errorToString.js";
import {LLM_API_URL_SETTING} from "../../constants.js";

export const DeleteTasks = () => {
    return createGenericCUDTool({
        toolName: "DeleteTasks",
        description: "Delete tasks",
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
                                description: "UUID of task to delete"
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
                const task = await appConnector.getTask(taskUUID);
                if (!task) throw new Error(`Task ${taskUUID} not found.`);
                tasksContainerList.push({
                    item: task,
                    checked: true,
                });
            }
            setFormData({...formData, tasksContainerList});
            setFormState('waitingForUserInput');
        },
        renderWaitingForUserInput: ({formData, setFormData, status, setFormState}) => {
            const setTasksContainerList = (tasksContainerList) => {
                setFormData({...formData, tasksContainerList});
            };

            const { Text } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>Select tasks to delete:</Text>
                    <ItemSelectionTable
                        itemContainerList={formData.tasksContainerList}
                        setItemContainerList={setTasksContainerList}
                        status={status}
                    />
                    <ToolFooter
                        submitButtonText="Delete Tasks"
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
            const successfulDeletedItems = [];
            const failedItems = [];
            for (const selectedItemContainer of selectedItemContainerList) {
                try {
                    const result =
                        (await deleteTask({
                            taskUUID: selectedItemContainer.item.uuid
                        })) || selectedItemContainer.item;
                    successfulDeletedItems.push(result);
                } catch (e) {
                    failedItems.push(selectedItemContainer.item);
                    lastError = e;
                    console.error(e);
                }
            }

            if (failedItems.length === selectedItemContainerList.length) {
                throw "Failed to delete all of the selected tasks. Sample error: " + errorToString(lastError);
            }

            setFormData({...formData, successfulDeletedItems, failedItems, lastError});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            const {successfulDeletedItems, failedItems} = formData;
            const lastError = formData.lastError;
            if (failedItems.length === 0) {
                addResult({resultSummary: `${successfulDeletedItems.length} tasks deleted successfully.`,
                    resultDetail: successfulDeletedItems});
            } else {
                addResult({resultSummary: `${successfulDeletedItems.length} tasks deleted successfully. ` +
                        `${failedItems.length} tasks failed to delete. ` +
                        `Error sample: ${errorToString(lastError)}`,
                    resultDetail: successfulDeletedItems, failedResultDetail: failedItems});
            }
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { CheckboxIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.successfulDeletedItems)}
                text={`${formData.successfulDeletedItems.length} tasks deleted successfully.` +
                    (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} tasks failed to delete.` : "")}
                icon={<CheckboxIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const deleteTask = async ({ taskUUID }) => {
    // TODO: No api support for deleting task yet
    return await appConnector.deleteTask(taskUUID);
}
