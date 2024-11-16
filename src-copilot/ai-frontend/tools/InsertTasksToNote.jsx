import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {createGenericMultiInsertTool} from "../tool-helpers/createGenericMultiInsertTool.jsx";

export const InsertTasksToNote = () => {
    return createGenericMultiInsertTool({
        toolName: "InsertTasksToNote",
        description: "Create tasks and insert to user's note. ",
        parameters: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            taskContent: {
                                type: "string",
                                minLength: 1,
                                description: "The content of the task."
                            },
                            taskStartAt: {
                                type: "string",
                                description: "The start date and time of the task in ISO format."
                            },
                            taskendAt: {
                                type: "string",
                                description: "The end date and time of the task in ISO format. Must be after startAt. (Optional)"
                            },
                            taskScore: {
                                type: "number",
                                description: "The score of the task. (Optional)"
                            }
                        },
                        required: ["taskContent"]
                    }
                },
                noteUUID: {
                    type: "string",
                    description: "The UUID of the note to insert the task into."
                }
            },
            required: ["tasks", "noteUUID"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        itemName: 'tasks',
        parameterPathForInsertItemArray: 'tasks',
        insertItemFunction: async ({ selectedNoteUUID, item }) => {
            const taskUUID = await appConnector.insertTask({uuid: selectedNoteUUID}, {
                content: item.taskContent
            });
            if (!taskUUID) throw new Error('Failed to insert task');
            if (item.taskStartAt) {
                await appConnector.updateTask(taskUUID, {
                    startAt: (Date.parse(item.taskStartAt) / 1000) // convert to timestamp
                });
            }
            if (item.taskendAt) {
                await appConnector.updateTask(taskUUID, {
                    endAt: (Date.parse(item.taskendAt) / 1000) // convert to timestamp
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
    });
}