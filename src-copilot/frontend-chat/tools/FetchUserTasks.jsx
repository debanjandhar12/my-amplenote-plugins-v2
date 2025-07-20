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
                    description: "Sql Select statement (duckdb - see examples) to search tasks from user_tasks table.\n" +
                        "Available fields: " +
                        "completedAt, dismissedAt, endAt, hideUntil, startAt (TIMESTAMP)\n" +
                        "content, noteUUID, taskUUID, taskDomainUUID, taskDomainName (VARCHAR)\n" +
                        "urgent, important (BOOLEAN)\n" +
                        "score (DOUBLE)\n" +
                        "Examples:\n" +
                        "Find tasks for 25th december: SELECT * FROM user_tasks WHERE DATE(startAt) = '2024-12-25';\n" +
                        "Find tasks completed after 25th december 5pm: SELECT * FROM user_tasks WHERE completedAt > TIMESTAMPTZ '2025-07-16T17:00:00+05:30';\n" +
                        "Find task by content: SELECT * FROM user_tasks WHERE regexp_matches(content, '(shop|buy)', 'i');\n" +
                        "Find urgent tasks: SELECT * FROM user_tasks WHERE urgent = true;\n" +
                        "Find incomplete tasks: SELECT * FROM user_tasks WHERE completedAt IS NULL;\n"
                }
            },
            required: ["query"]
        },
        category: "tasks",
        onInit: async ({args, formData, setFormData, setFormState}) => {
            try {
                const result = await appConnector.searchUserTasks(args.query);

                if (result.success) {
                    setFormData({...formData, queryResult: result.results});
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
            const {queryResult} = formData;
            addResult({
                resultSummary: `Query completed. Found ${queryResult.length} matching results.`,
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
                text={`${formData.queryResult.length} tasks found.`}
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
