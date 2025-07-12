import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";

export const FetchUserTasks =() => {
    return createGenericReadTool({
        toolName: "FetchUserTasks",
        description: "Query to fetch information about existing tasks.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "SQL SELECT query to search tasks from the user_tasks table.\n" +
                        "Available fields: " +
                        "completedAt, dismissedAt, endAt, hideUntil, startAt (TIMESTAMP)\n" +
                        "content, noteUUID, taskUUID, taskDomainUUID, taskDomainName (VARCHAR)\n" +
                        "urgent, important (BOOLEAN)\n" +
                        "score (DOUBLE)\n" +
                        "Examples:\n" +
                        "Find tasks for 25th december: SELECT * FROM user_tasks WHERE startAt >= '2024-12-25 00:00:00' AND startAt <= '2024-12-25 23:59:59';\n" +
                        "Find tasks in note: SELECT * FROM user_tasks WHERE noteUUID = 'note-uuid';\n" +
                        "Find task with content: SELECT * FROM user_tasks WHERE content ILIKE '%groceries%';\n" +
                        "Find urgent tasks: SELECT * FROM user_tasks WHERE urgent = true;\n" +
                        "Find incomplete tasks: SELECT * FROM user_tasks WHERE completedAt IS NULL;\n"
                }
            },
            required: ["query"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState}) => {
            try {
                const result = await appConnector.searchUserTasks(args.query);
                
                if (result.success) {
                    setFormData({...formData, queryResult: result.results, taskCount: result.taskCount});
                    setFormState('completed');
                } else {
                    throw new Error(result.error || 'Failed to search tasks');
                }
            } catch (error) {
                console.error('Error searching tasks:', error);
                setFormData({...formData, error: error.message, queryResult: []});
                setFormState('error');
            }
        },
        onCompleted: ({addResult, formData}) => {
            const {queryResult, taskCount} = formData;
            addResult({
                resultSummary: `Query completed. Synced ${taskCount || 0} tasks and found ${queryResult.length} matching results.`, 
                resultDetail: queryResult
            });
        },
        renderInit: ({args}) => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Searching for tasks...`} icon={<Spinner />} />
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { CheckboxIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.queryResult)}
                text={`${formData.queryResult.length} tasks found from ${formData.taskCount || 0} synced tasks.`}
                icon={<CheckboxIcon />}
                toolName={toolName}
                input={args} />
        },
        renderError: ({formData, toolName, args}) => {
            const { ExclamationTriangleIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={formData.error || 'Unknown error occurred'}
                text={`Error searching tasks: ${formData.error || 'Unknown error'}`}
                icon={<ExclamationTriangleIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

