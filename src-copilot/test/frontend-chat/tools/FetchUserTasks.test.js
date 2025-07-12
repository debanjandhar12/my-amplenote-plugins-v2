import { DuckDBUserTasksManager } from "../../../CopilotDB/DuckDB/DuckDBUserTasksManager.js";

describe('DuckDBUserTasksManager', () => {
    let manager;

    // Mock appConnector globally
    beforeAll(() => {
        global.appConnector = {
            getTaskDomains: jest.fn().mockResolvedValue([
                { uuid: 'domain-1', name: 'Work' },
                { uuid: 'domain-2', name: 'Personal' }
            ]),
            getTaskDomainTasks: jest.fn()
                .mockResolvedValueOnce([
                    {
                        uuid: 'task-1',
                        content: 'Complete project',
                        urgent: true,
                        important: true,
                        completedAt: null,
                        dismissedAt: null,
                        startAt: 1703498400, // 2023-12-25 in Unix timestamp
                        endAt: new Date('2023-12-25T18:00:00Z'),
                        hideUntil: null,
                        noteUUID: 'note-1',
                        score: 95.5
                    }
                ])
                .mockResolvedValueOnce([
                    {
                        uuid: 'task-2',
                        content: 'Review code',
                        urgent: false,
                        important: true,
                        completedAt: 1703584800, // 2023-12-26 in Unix timestamp
                        dismissedAt: null,
                        startAt: 1703498400,
                        endAt: new Date('2023-12-26T17:00:00Z'),
                        hideUntil: null,
                        noteUUID: 'note-2',
                        score: 87.2
                    }
                ])
        };
    });

    beforeEach(() => {
        manager = new DuckDBUserTasksManager();
    });

    it('validates SQL queries correctly', () => {
        // Valid SELECT query should pass
        expect(() => manager._validateSQLQuery('SELECT * FROM user_tasks')).not.toThrow();

        // SELECT with WHERE clause should pass
        expect(() => manager._validateSQLQuery('SELECT * FROM user_tasks WHERE urgent = true')).not.toThrow();

        // DELETE query should be rejected
        expect(() => manager._validateSQLQuery('DELETE FROM user_tasks WHERE id = 1')).toThrow('Only SELECT statements are allowed');

        // INSERT query should be rejected
        expect(() => manager._validateSQLQuery('INSERT INTO user_tasks VALUES (1, \'test\')')).toThrow('Only SELECT statements are allowed');

        // UPDATE query should be rejected
        expect(() => manager._validateSQLQuery('UPDATE user_tasks SET content = \'test\'')).toThrow('Only SELECT statements are allowed');

        // Non-SELECT query should be rejected
        expect(() => manager._validateSQLQuery('CREATE TABLE test (id INT)')).toThrow('Only SELECT statements are allowed');

        // Query with wrong table should be rejected
        expect(() => manager._validateSQLQuery('SELECT * FROM wrong_table')).toThrow('Only queries against \'user_tasks\' table are allowed');
    });

    it('validates complex SQL queries correctly', () => {
        // Complex SELECT with joins, subqueries, etc. should pass if they only reference user_tasks
        const complexQuery = `
            SELECT content, urgent, important, score
            FROM user_tasks
            WHERE completedAt IS NULL
            AND (urgent = true OR important = true) 
            ORDER BY score DESC 
            LIMIT 5
        `;
        expect(() => manager._validateSQLQuery(complexQuery)).not.toThrow();
        
        // Query with comments should still be validated properly
        const queryWithComments = `
            -- Get urgent tasks
            SELECT * FROM user_tasks 
            WHERE urgent = true /* only urgent ones */
        `;
        expect(() => manager._validateSQLQuery(queryWithComments)).not.toThrow();
        
        // Hidden DELETE in comments should still pass (since comments are removed)
        const hiddenDeleteInComment = `
            /* DELETE FROM user_tasks */
            SELECT * FROM user_tasks WHERE urgent = true
        `;
        expect(() => manager._validateSQLQuery(hiddenDeleteInComment)).not.toThrow();
    });

    it('handles empty or invalid queries', () => {
        expect(() => manager._validateSQLQuery('')).toThrow('Only SELECT statements are allowed');
        expect(() => manager._validateSQLQuery('   ')).toThrow('Only SELECT statements are allowed');
        expect(() => manager._validateSQLQuery('INVALID QUERY')).toThrow('Only SELECT statements are allowed');
    });
});
