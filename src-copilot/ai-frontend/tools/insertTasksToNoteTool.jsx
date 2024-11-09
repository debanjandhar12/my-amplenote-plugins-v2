import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {createMultiInsertItemTool} from "../tool-helpers/createMultiInsertItemTool.jsx";

export const insertTasksToNoteTool = () => {
    return createMultiInsertItemTool({
        toolName: "insertTasksToNoteTool",
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
        parameterPathForInsertItemArray: 'tasks',
        insertItemFunction: async ({ args, item }) => {
            await appConnector.insertTask({uuid: args.noteUUID}, {
                content: item.taskContent,
                startAt: (Date.parse(item.taskStartAt) / 1000) // convert to timestamp
            });
        }
    });
}