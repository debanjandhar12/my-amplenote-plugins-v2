import {createGenericCUDTool} from "../tool-helpers/createGenericCUDTool.jsx";
import {ToolFooter} from "../components/ToolFooter.jsx";
import {ItemSelectionTable} from "../components/ItemSelectionTable.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {errorToString} from "../utils/errorToString.js";

export const DeleteUserTasks = () => {
    return createGenericCUDTool({
        toolName: "DeleteUserTasks",
        description: "Delete user tasks.",
        parameters: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            taskUUID: {
                                type: "string",
                                description: "The UUID of the task to delete."
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
            return (
                <ToolCardContainer>
                    <RadixUI.Text>Select tasks to delete:</RadixUI.Text>
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
            let resultText = `${successfulDeletedItems.length} tasks deleted successfully.
                Details: ${JSON.stringify(successfulDeletedItems)}`;
            if (failedItems.length > 0) {
                resultText += `\n${failedItems.length} tasks failed to delete.
                    Details: ${JSON.stringify(failedItems)}\n
                    Error sample: ${errorToString(lastError)}`;
            }
            addResult(resultText);
        },
        renderCompleted: ({formData}) => {
            return (
                <ToolCardMessageWithResult result={JSON.stringify(formData.successfulDeletedItems)}
                                           text={`${formData.successfulDeletedItems.length} tasks deleted successfully.` +
                                               (formData.failedItems.length > 0 ? `\n${formData.failedItems.length} tasks failed to delete.` : "")}
                />
            )
        }
    });
}

const deleteTask = async ({ taskUUID }) => {
    // TODO: No api support for deleting task yet
    return await appConnector.deleteTask(taskUUID);
}