import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";

export const getUserTasksTool =() => {
    return createGenericReadTool({
        toolName: "getUserTasksTool",
        description: "Run SQL query to fetch information about existing tasks. You can use it to get tasks between date range, tasks inside specific note, collect aggregate information on tasks etc. Only SELECT queries are allowed.",
        parameters: {
            type: "object",
            properties: {
                sqlQuery: {
                    type: "string",
                    description: "SQL query to retrieve tasks from the USER_TASKS table.\n" +
                        "Columns in USER_TASKS include: " +
                        "completedAt (Date), content (STRING), dismissedAt (Date), endAt (Date), " +
                        "hideUntil (Date), important (BOOLEAN), noteUUID (STRING), score (NUMBER), " +
                        "startAt (Date), urgent (BOOLEAN), taskUUID (STRING), " +
                        "taskDomainUUID (STRING), taskDomainName (STRING).\n" +
                        "Default sort order is by startAt in descending order. " +
                        "You can specify other columns for sorting.\n" +
                        "Example query to select all tasks between 2024-01-21 to 2024-01-22: SELECT content, startAt, endAt, completedAt, important FROM USER_TASKS WHERE startAt BETWEEN DATE(\"2024-01-21T00:00:00\") AND DATE(\"2024-01-22T23:59:59\") ORDER BY startAt DESC;\n" +
                        "Example query to count all tasks: SELECT COUNT(*) FROM USER_TASKS;"
                }
            },
            required: ["sqlQuery"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        itemName: 'tasks',
        onInitFunction: async ({args}) => {
            const alasql = (await dynamicImportESM("alasql")).default;
            window.alasql = alasql;
            alasql(`CREATE TABLE IF NOT EXISTS USER_TASKS (
                            completedAt Date,
                            content STRING,
                            dismissedAt Date,
                            endAt Date,
                            hideUntil Date,
                            important BOOLEAN,
                            noteUUID STRING,
                            score NUMBER,
                            startAt Date,
                            urgent BOOLEAN,
                            taskUUID STRING,
                            taskDomainUUID STRING,
                            taskDomainName STRING
                        );`);
            alasql(`TRUNCATE TABLE USER_TASKS;`);
            let allTasks = [];
            const taskDomains = await appConnector.getTaskDomains();
            for (const taskDomain of taskDomains) {
                const tasks = await appConnector.getTaskDomainTasks(taskDomain.uuid);
                for (const task of tasks) {
                    allTasks = [...allTasks, {
                        completedAt: new Date(task.completedAt * 1000),
                        content: task.content,
                        dismissedAt: new Date(task.dismissedAt * 1000),
                        endAt: new Date(task.endAt),
                        hideUntil: new Date(task.hideUntil * 1000),
                        important: task.important,
                        noteUUID: task.noteUUID,
                        score: task.score,
                        startAt: new Date(task.startAt * 1000),
                        urgent: task.urgent,
                        taskUUID: task.uuid,
                        taskDomainUUID: taskDomain.uuid,
                        taskDomainName: taskDomain.name
                    }];
                }
            }
            alasql.tables.USER_TASKS.data = allTasks;
            return alasql(args.sqlQuery);
        }
    });
}