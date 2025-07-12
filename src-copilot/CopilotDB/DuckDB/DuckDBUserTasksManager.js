import DuckDBConnectionController from "./DuckDBConnectionController.js";
import {isArray} from "lodash-es";

export class DuckDBUserTasksManager {
    async init() {
        if (this.db && !DuckDBConnectionController.isTerminated()) return;
        try {
            this.db = await DuckDBConnectionController.getCollectionInstance('CopilotTempDB', {persistent: false});
            const conn = await this.db.connect();
            await conn.query(`CHECKPOINT;`);
            await conn.close();
        } catch (e) {
            console.error('DuckDBUserTasksManager init error:', e);
            throw e;
        }
    }

    async _syncUserTasks() {
        await this.init();
        let conn;

        try {
            conn = await this.db.connect();

            // Drop existing tasks table if it exists
            await conn.query(`DROP TABLE IF EXISTS user_tasks;`);

            // Create tasks table
            await conn.query(`
                CREATE TABLE user_tasks (
                    completedAt TIMESTAMP,
                    dismissedAt TIMESTAMP,
                    endAt TIMESTAMP,
                    hideUntil TIMESTAMP,
                    startAt TIMESTAMP,
                    content VARCHAR,
                    noteUUID VARCHAR,
                    taskUUID VARCHAR,
                    taskDomainUUID VARCHAR,
                    taskDomainName VARCHAR,
                    urgent BOOLEAN,
                    important BOOLEAN,
                    score DOUBLE
                );
            `);

            // Fetch tasks from appConnector
            let allTasks = [];
            const taskDomains = await appConnector.getTaskDomains();
            
            for (const taskDomain of taskDomains) {
                const tasks = await appConnector.getTaskDomainTasks(taskDomain.uuid);
                for (const task of tasks) {
                    allTasks.push({
                        completedAt: task.completedAt ? new Date(task.completedAt * 1000) : null,
                        dismissedAt: task.dismissedAt ? new Date(task.dismissedAt * 1000) : null,
                        endAt: task.endAt ? new Date(task.endAt) : null,
                        hideUntil: task.hideUntil ? new Date(task.hideUntil * 1000) : null,
                        startAt: task.startAt ? new Date(task.startAt * 1000) : null,
                        content: task.content || null,
                        noteUUID: task.noteUUID || null,
                        taskUUID: task.uuid || null,
                        taskDomainUUID: taskDomain.uuid || null,
                        taskDomainName: taskDomain.name || null,
                        urgent: task.urgent || false,
                        important: task.important || false,
                        score: task.score || 0
                    });
                }
            }

            // Insert tasks into the table
            if (allTasks.length > 0) {
                const placeholders = allTasks.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                const insertQuery = `
                    INSERT INTO user_tasks (
                        completedAt, dismissedAt, endAt, hideUntil, startAt,
                        content, noteUUID, taskUUID, taskDomainUUID, taskDomainName,
                        urgent, important, score
                    ) VALUES ${placeholders}
                `;

                const values = allTasks.flatMap(task => [
                    task.completedAt, task.dismissedAt, task.endAt, task.hideUntil, task.startAt,
                    task.content, task.noteUUID, task.taskUUID, task.taskDomainUUID, task.taskDomainName,
                    task.urgent, task.important, task.score
                ]);

                await conn.query(insertQuery, ...values);
            }

            return allTasks.length;
        } catch (e) {
            console.error("Failed to sync user tasks:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    _validateSQLQuery(sqlQuery) {
        // Remove comments and normalize whitespace
        const cleanQuery = sqlQuery
            .replace(/--.*$/gm, '') // Remove line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .trim()
            .toLowerCase();

        // Check if it's a SELECT statement
        if (!cleanQuery.startsWith('select')) {
            throw new Error('Only SELECT statements are allowed');
        }

        // Check for forbidden keywords that could be used for modification
        const forbiddenKeywords = [
            'insert', 'update', 'delete', 'drop', 'create', 'alter', 
            'truncate', 'replace', 'merge', 'upsert', 'exec', 'execute',
            'pragma', 'attach', 'detach', 'vacuum'
        ];

        const queryWords = cleanQuery.split(/\s+/);
        for (const word of queryWords) {
            if (forbiddenKeywords.includes(word)) {
                throw new Error(`Forbidden keyword '${word}' found in query`);
            }
        }

        // Ensure the query only references the user_tasks table
        if (cleanQuery.includes('from') && !cleanQuery.includes('from user_tasks')) {
            // Allow subqueries and joins as long as they reference user_tasks
            const fromMatches = cleanQuery.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
            if (fromMatches) {
                for (const match of fromMatches) {
                    const tableName = match.replace(/from\s+/, '');
                    if (tableName !== 'user_tasks') {
                        throw new Error(`Only queries against 'user_tasks' table are allowed. Found: ${tableName}`);
                    }
                }
            }
        }

        return true;
    }

    async _searchUserTasks(sqlQuery) {
        await this.init();
        let conn;

        try {
            // Validate the SQL query
            this._validateSQLQuery(sqlQuery);

            conn = await this.db.connect();
            const result = await conn.query(sqlQuery);
            const rows = result.toArray();
            
            // Convert the results to a more usable format
            const processedResults = rows.map(row => {
                const processedRow = {};
                for (const key in row) {
                    if (row[key] instanceof Date) {
                        processedRow[key] = row[key].toISOString();
                    } else {
                        processedRow[key] = row[key];
                    }
                }
                return processedRow;
            });

            return processedResults;
        } catch (e) {
            console.error("Failed to search user tasks:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    async searchUserTasks(sqlQuery) {
        try {
            // First sync the tasks
            const taskCount = await this._syncUserTasks();
            console.log(`Synced ${taskCount} tasks to temporary table`);

            // Then search with the provided SQL query
            const results = await this._searchUserTasks(sqlQuery);
            
            return {
                success: true,
                taskCount: taskCount,
                results: results,
                resultCount: results.length
            };
        } catch (e) {
            console.error("Failed in searchUserTasks:", e);
            return {
                success: false,
                error: e.message || 'Unknown error occurred',
                taskCount: 0,
                results: [],
                resultCount: 0
            };
        }
    }
}