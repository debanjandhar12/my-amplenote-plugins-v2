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

    async _syncUserTasks(app) {
        await this.init();
        let conn;

        try {
            conn = await this.db.connect();

            // Drop existing tasks table if it exists
            await conn.query(`DROP TABLE IF EXISTS user_tasks;`);

            // Create tasks table
            await conn.query(`
                CREATE OR REPLACE TABLE user_tasks (
                    completedAt TIMESTAMP,
                    dismissedAt TIMESTAMP,
                    endAt TIMESTAMP,
                    hideUntil TIMESTAMP,
                    startAt TIMESTAMP,
                    content VARCHAR,
                    noteUUID VARCHAR,
                    taskUUID VARCHAR PRIMARY KEY,
                    taskDomainUUID VARCHAR,
                    taskDomainName VARCHAR,
                    urgent BOOLEAN,
                    important BOOLEAN,
                    score DOUBLE
                );
            `);

            let allTasks = [];

            // Fetch tasks from notes (required to include tasks not present in any task domians)
            const notes = await app.filterNotes({ group: "taskLists" });
            for (const note of notes) {
                const tasks = await app.getNoteTasks({ uuid: note.uuid }, {includeDone: true});
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
                        taskDomainUUID: null,
                        taskDomainName: null,
                        urgent: task.urgent || false,
                        important: task.important || false,
                        score: task.score || 0
                    });
                }
            }

            // Fetch tasks from task domains (required to include task domain information)
            const taskDomains = await app.getTaskDomains();
            for (const taskDomain of taskDomains) {
                const tasks = await app.getTaskDomainTasks(taskDomain.uuid);
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
                await conn.query('BEGIN TRANSACTION');
                const stmt = await conn.prepare(`
                    INSERT OR REPLACE INTO user_tasks (
                        completedAt, dismissedAt, endAt, hideUntil, startAt,
                        content, noteUUID, taskUUID, taskDomainUUID, taskDomainName,
                        urgent, important, score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                for (const task of allTasks) {
                    await stmt.query(
                        task.completedAt, task.dismissedAt, task.endAt, task.hideUntil, task.startAt,
                        task.content, task.noteUUID, task.taskUUID, task.taskDomainUUID, task.taskDomainName,
                        task.urgent, task.important, task.score
                    );
                }

                await conn.query('COMMIT');
                await stmt.close();
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

    async _validateSQLQuery(sqlQuery, conn) {
        try {
            console.log('sqlQuery print', sqlQuery);
            // Use DuckDB's built-in SQL parser
            const parseResult = await conn.query(`SELECT json_serialize_sql('${sqlQuery.replace(/'/g, "''")}') as parsed`);
            const parsedData = parseResult.toArray()[0];
            const parsed = JSON.parse(parsedData.parsed);

            // Check if parsing failed
            if (parsed.error) {
                throw new Error('Invalid SQL syntax');
            }

            // Validate all statements are SELECT statements
            for (const statement of parsed.statements) {
                if (!this._isSelectStatement(statement.node)) {
                    throw new Error('Only SELECT statements are allowed');
                }

                // Validate table references
                this._validateTableReferences(statement.node);
            }

            return true;
        } catch (e) {
            if (e.message.includes('Only SELECT statements are allowed') ||
                e.message.includes('Invalid SQL syntax') ||
                e.message.includes('Only queries against')) {
                throw e;
            }
            throw new Error('Invalid SQL query: ' + e.message);
        }
    }

    _isSelectStatement(node) {
        if (!node || !node.type) return false;

        // Check if this is a SELECT node
        if (node.type === 'SELECT_NODE') {
            return true;
        }

        // Check for compound SELECT statements (UNION, INTERSECT, EXCEPT)
        if (node.type === 'SET_OPERATION_NODE') {
            return this._isSelectStatement(node.left) && this._isSelectStatement(node.right);
        }

        // Check for WITH clauses (CTEs)
        if (node.type === 'CTE_NODE') {
            return this._isSelectStatement(node.query);
        }

        return false;
    }

    _validateTableReferences(node) {
        if (!node) return;

        // Check FROM clause
        if (node.from_table) {
            this._validateFromClause(node.from_table);
        }

        // Check CTEs
        if (node.cte_map && node.cte_map.map) {
            for (const cte of node.cte_map.map) {
                if (cte.query) {
                    this._validateTableReferences(cte.query);
                }
            }
        }

        // Check subqueries in SELECT list
        if (node.select_list) {
            for (const selectItem of node.select_list) {
                if (selectItem.class === 'SUBQUERY') {
                    this._validateTableReferences(selectItem.subquery);
                }
            }
        }

        // Check subqueries in WHERE clause
        if (node.where_clause) {
            this._validateExpressionForSubqueries(node.where_clause);
        }
    }

    _validateFromClause(fromClause) {
        if (!fromClause) return;

        if (fromClause.type === 'BASE_TABLE') {
            if (fromClause.table_name !== 'user_tasks') {
                throw new Error(`Only queries against 'user_tasks' table are allowed. Found: ${fromClause.table_name}`);
            }
        } else if (fromClause.type === 'JOIN') {
            this._validateFromClause(fromClause.left);
            this._validateFromClause(fromClause.right);
        } else if (fromClause.type === 'SUBQUERY') {
            this._validateTableReferences(fromClause.subquery);
        }
    }

    _validateExpressionForSubqueries(expression) {
        if (!expression) return;

        if (expression.class === 'SUBQUERY') {
            this._validateTableReferences(expression.subquery);
        }

        // Recursively check child expressions
        if (expression.children) {
            for (const child of expression.children) {
                this._validateExpressionForSubqueries(child);
            }
        }
    }

    async _searchUserTasks(sqlQuery) {
        await this.init();
        let conn;

        try {
            conn = await this.db.connect();

            // Validate the SQL query using DuckDB's parser
            await this._validateSQLQuery(sqlQuery, conn);

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

    async searchUserTasks(app, sqlQuery) {
        try {
            // First sync the tasks
            const taskCount = await this._syncUserTasks(app);
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
