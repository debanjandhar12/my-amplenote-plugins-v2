import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const FetchUserTasks =() => {
    return createGenericReadTool({
        toolName: "FetchUserTasks",
        description: "Query to fetch information about existing tasks.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string", // Does not work with OpenAI when set to "object"
                    description: "MongoDB like query object as string to find tasks.\n" +
                        "Available fields: " +
                        "completedAt, dismissedAt, endAt, hideUntil, startAt (date)\n" +
                        "content, noteUUID, taskUUID, taskDomainUUID, taskDomainName (string)\n" +
                        "urgent, important (boolean)\n" +
                        "score (number)\n" +
                        "Examples:\n" +
                        "Find tasks for 25th december: {\"startAt\": {\"$gte\": \"2024-12-25 00:00:00\", \"$lte\": \"2024-12-25 23:59:59\"}};\n" +
                        "Find tasks in note: {\"noteUUID\": \"note-uuid\"};\n" +
                        "Find task with content: {\"content\": {\"$regex\":\"groceries\",\"$options\":\"i\"}};\n"
                }
            },
            required: ["query"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState}) => {
            const Loki = (await dynamicImportESM("lokijs")).default;
            const db = new Loki("tasks.db");
            const tasksCollection = db.addCollection("tasks");

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
            
            tasksCollection.insert(allTasks);
            window.tasksCollection = tasksCollection;
            const queryObj = processQuery(args.query);
            const results = tasksCollection.find(queryObj);
            setFormData({...formData, sqlOutput: results});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {sqlOutput} = formData;
            addResult(`Fetched ${sqlOutput.length} tasks. Details: ${JSON.stringify(sqlOutput)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.sqlOutput)}
                                              text={`${formData.sqlOutput.length} tasks fetched successfully.`}/>
        }
    });
}

const processQuery = (query) => {
    if (!query) throw new Error("Provided query cannot be empty");
    const queryObj = typeof query === "object" ? query : JSON.parse(query);
    // convert date strings to Date objects
    for (const key in queryObj) {
        if (queryObj[key].hasOwnProperty("$gte")) {
            queryObj[key].$gte = new Date(queryObj[key].$gte);
        }
        if (queryObj[key].hasOwnProperty("$lte")) {
            queryObj[key].$lte = new Date(queryObj[key].$lte);
        }
    }
    // change all comparison to js ones
    // https://github.com/techfort/LokiJS/blob/25b9a33d57509717d43b4da06d92064f2b7a6c95/src/lokijs.js#L678
    for (const key in queryObj) {
        if (queryObj[key].hasOwnProperty("$eq")) {
            queryObj[key].$aeq = queryObj[key]['$eq'];
            delete queryObj[key]['$eq'];
        }
        if (queryObj[key].hasOwnProperty("$gt")) {
            queryObj[key].$jgt = queryObj[key]['$gt'];
            delete queryObj[key]['$gt'];
        }
        if (queryObj[key].hasOwnProperty("$gte")) {
            queryObj[key].$jgte = queryObj[key]['$gte'];
            delete queryObj[key]['$gte'];
        }
        if (queryObj[key].hasOwnProperty("$lt")) {
            queryObj[key].$jlt = queryObj[key]['$lt'];
            delete queryObj[key]['$lt'];
        }
        if (queryObj[key].hasOwnProperty("$lte")) {
            queryObj[key].$jlte = queryObj[key]['$lte'];
            delete queryObj[key]['$lte'];
        }
        if (queryObj[key].hasOwnProperty("$between")) {
            queryObj[key].$jbetween = queryObj[key]['$between'];
            delete queryObj[key]['$between'];
        }
    }
    return queryObj;
}

const processResults = (results) => {
    return results.map((result) => {
        let task = {};
        task.completedAt = result.completedAt ? window.dayjs(result.completedAt).format() : null;
        task.dismissedAt = result.dismissedAt ? window.dayjs(result.dismissedAt).format() : null;
        task.endAt = result.endAt ? window.dayjs(result.endAt).format() : null;
        task.hideUntil = result.hideUntil ? window.dayjs(result.hideUntil).format() : null;
        task.startAt = result.startAt ? window.dayjs(result.startAt).format() : null;
        task.content = result.content;
        task.noteUUID = result.noteUUID;
        task.taskUUID = result.taskUUID;
        task.taskDomainUUID = result.taskDomainUUID;
        task.taskDomainName = result.taskDomainName;
        task.urgent = result.urgent;
        task.important = result.important;
        task.score = result.score;
        return task;
    });
}