import {LOCAL_VEC_DB_INDEX_VERSION} from "../../constants.js";
import DuckDBWorkerManager from "./DuckDBWorkerManager.js";
import {OPFSManager} from "./OPFSManager.js";
import {isArray} from "lodash-es";

let instance;
export class DuckDBManager {
    async init() {
        if (this.db && !DuckDBWorkerManager.isTerminated()) return;
        try {
            this.db = await DuckDBWorkerManager.getCollectionInstance('CopilotLocalVecDB');
            const conn = await this.db.connect();

            // Check if we need to reset the database due to version change
            const currentVersion = await this._getConfigValue(conn, 'LOCAL_VEC_DB_INDEX_VERSION');
            if (currentVersion !== String(LOCAL_VEC_DB_INDEX_VERSION)) {
                await this._resetTables(conn);
                await this._createTables(conn);
                await this._setConfigValue(conn, 'LOCAL_VEC_DB_INDEX_VERSION', LOCAL_VEC_DB_INDEX_VERSION);
            }
            await conn.send(`CHECKPOINT;`);
            await conn.close();
            if (await OPFSManager.doesFileExists(`CopilotLocalVecDB.db`) === false) {
                throw new Error('DuckDB file not created in OPFS after all init operations');
            }
        } catch (e) {
            console.error('DuckDBManager init error:', e);
            throw e;
        }
    }

    async _createTables(conn) {
        // Notes embeddings table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS USER_NOTE_EMBEDDINGS (
                id VARCHAR PRIMARY KEY,
                actualNoteContentPart VARCHAR,
                embedding FLOAT[],
                headingAnchor VARCHAR,
                isArchived BOOLEAN,
                isPublished BOOLEAN,
                isSharedByMe BOOLEAN,
                isSharedWithMe BOOLEAN,
                isTaskListNote BOOLEAN,
                noteTags VARCHAR[],
                noteTitle VARCHAR,
                noteUUID VARCHAR,
                processedNoteContent VARCHAR
            )
        `);

        // Create index on noteUUID
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_user_note_embeddings_uuid ON USER_NOTE_EMBEDDINGS(noteUUID)
        `);

        // Help center embeddings table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS HELP_CENTER_EMBEDDINGS (
                id VARCHAR PRIMARY KEY,
                actualNoteContentPart VARCHAR,
                embedding FLOAT[],
                headingAnchor VARCHAR,
                isArchived BOOLEAN,
                isPublished BOOLEAN,
                isSharedByMe BOOLEAN,
                isSharedWithMe BOOLEAN,
                isTaskListNote BOOLEAN,
                noteTags VARCHAR[],
                noteTitle VARCHAR,
                noteUUID VARCHAR,
                processedNoteContent VARCHAR
            )
        `);

        // Create index on noteUUID for help center
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_help_center_embeddings_uuid ON HELP_CENTER_EMBEDDINGS(noteUUID)
        `);

        // Config table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS DB_CONFIG (
                key VARCHAR PRIMARY KEY,
                value VARCHAR
            )
        `);

        // Create index on key
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_db_config_key ON DB_CONFIG(key)
        `);
    }

    async _resetTables(conn) {
        try {
            await conn.query('DROP TABLE IF EXISTS DB_CONFIG');
            await conn.query('DROP TABLE IF EXISTS USER_NOTE_EMBEDDINGS');
            await conn.query('DROP TABLE IF EXISTS HELP_CENTER_EMBEDDINGS');
            console.log('DuckDBManager resetTables completed');
        } catch (e) {
            console.error('Error resetting tables:', e);
        }
    }

    /**
     * Reset the database to its initial state.
     * @returns {Promise<void>}
     */
    async resetDB() {
        await this.init();
        const conn = await this.db.connect();
        await this._resetTables(conn);
        await this._createTables(conn);
        await this._setConfigValue(conn, 'LOCAL_VEC_DB_INDEX_VERSION', LOCAL_VEC_DB_INDEX_VERSION);
        await conn.send(`CHECKPOINT;`);
        conn.close();
        console.log('LocalVecDB resetDB');
    }

    // --------------------------------------------
    // -------------- NOTE TABLE ------------------
    // --------------------------------------------
    /**
     * Returns the count of unique notes in db.
     * @returns {Promise<number>}
     */
    async getActualNoteCount() {
        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            const result = await conn.query('SELECT COUNT(DISTINCT noteUUID)::INTEGER as count FROM USER_NOTE_EMBEDDINGS');
            const count = result.toArray()[0].count;
            return count;
        } catch (e) {
            console.error("Failed to get note count in note embeddings:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    /**
     * Inserts / Updates a note embedding in the notes table.
     * @param noteEmbeddingObjArr
     * @returns {Promise<void>}
     */
    async putMultipleNoteEmbedding(noteEmbeddingObjArr) {
        await this.init();
        const errors = [];
        const conn = await this.db.connect();
        await conn.query('BEGIN TRANSACTION');
        const stmt = await conn.prepare(`
              INSERT OR REPLACE INTO USER_NOTE_EMBEDDINGS (
                  id, actualNoteContentPart, embedding, headingAnchor, isArchived,
                  isPublished, isSharedByMe, isSharedWithMe, isTaskListNote,
                  noteTags, noteTitle, noteUUID, processedNoteContent
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
        for (const noteEmbeddingObj of noteEmbeddingObjArr) {
            try {
                if (!noteEmbeddingObj.id) {
                    throw new Error('Note embedding object must have an "id" property.');
                }
                if (!noteEmbeddingObj.noteUUID) {
                    throw new Error('Note embedding object must have a "noteUUID" property.');
                }
                if (!noteEmbeddingObj.actualNoteContentPart) {
                  throw new Error('Note embedding object must have an "actualNoteContentPart" property.');
                }
                if (!noteEmbeddingObj.processedNoteContent) {
                  throw new Error('Note embedding object must have a "processedNoteContent" property.');
                }
                if (!noteEmbeddingObj.embedding) {
                    throw new Error('Note embedding object must have an "embedding" property.');
                }
                if (typeof noteEmbeddingObj.embedding === 'string') {
                    throw new Error('Note embedding object "embedding" property cannot be a string.');
                }
                if (noteEmbeddingObj.noteTags && !isArray(noteEmbeddingObj.noteTags)) {
                    throw new Error('Note embedding object "noteTags" property must be an array of strings.');
                }
                if (noteEmbeddingObj.embedding instanceof Float32Array ||
                      noteEmbeddingObj.embedding instanceof Float64Array) {
                  // Convert to array so we can JSON.stringify it
                  noteEmbeddingObj.embedding = Array.from(noteEmbeddingObj.embedding);
                }
                await stmt.query(
                    noteEmbeddingObj.id,
                    noteEmbeddingObj.actualNoteContentPart,
                    JSON.stringify(noteEmbeddingObj.embedding),
                    noteEmbeddingObj.headingAnchor,
                    noteEmbeddingObj.isArchived,
                    noteEmbeddingObj.isPublished,
                    noteEmbeddingObj.isSharedByMe,
                    noteEmbeddingObj.isSharedWithMe,
                    noteEmbeddingObj.isTaskListNote,
                    JSON.stringify(noteEmbeddingObj.noteTags),
                    noteEmbeddingObj.noteTitle,
                    noteEmbeddingObj.noteUUID,
                    noteEmbeddingObj.processedNoteContent
                );
            } catch (e) {
                errors.push({
                    message: `Failed to process item at index ${index} (id: ${noteEmbeddingObj.id || 'N/A'})`,
                    cause: e,
                    item: noteEmbeddingObj
                });
            }
        }
        if (errors.length > 0) {
            await conn.query('ROLLBACK');
            await stmt.close();
            conn.close();
            throw new AggregateError(errors, `Failed to insert ${errors.length} of ${noteEmbeddingObjArr.length} note embeddings.`);
        }
        await conn.query('COMMIT');
        await stmt.close();
        conn.close();
    }

    async searchNoteRecordByEmbedding(embedding, {limit = 10, thresholdSimilarity = 0, isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null} = {}) {
        await this.init();
        let conn;
        let stmt;

        try {
            conn = await this.db.connect();

            // Build WHERE clause conditions
            const conditions = ['similarity > ?'];
            const params = [];

            if (isArchived !== null) {
                conditions.push('isArchived = ?');
                params.push(isArchived);
            }
            if (isSharedByMe !== null) {
                conditions.push('isSharedByMe = ?');
                params.push(isSharedByMe);
            }
            if (isSharedWithMe !== null) {
                conditions.push('isSharedWithMe = ?');
                params.push(isSharedWithMe);
            }
            if (isTaskListNote !== null) {
                conditions.push('isTaskListNote = ?');
                params.push(isTaskListNote);
            }

            const whereClause = conditions.join(' AND ');

            stmt = await conn.prepare(`
                SELECT
                    *,
                    list_dot_product(embedding, ?) as similarity
                FROM
                    USER_NOTE_EMBEDDINGS
                WHERE
                    ${whereClause}
                ORDER BY
                    similarity DESC
                LIMIT ?;
            `);

            if (embedding instanceof Float32Array || embedding instanceof Float64Array) {
                // Convert to array so we can JSON.stringify it
                embedding = Array.from(embedding);
            }
            if (!isArray(embedding)) {
                throw new Error('Embedding must be an array of numbers.');
            }

            const results = await stmt.query(JSON.stringify(embedding), thresholdSimilarity, ...params, limit);
            let jsonResults = results.toArray().map(row => row.toJSON());
            jsonResults.forEach(row => {
                if (row.embedding) {
                    row.embedding = row.embedding.toArray();
                }
                if (!(row.embedding instanceof Float32Array)) {
                    row.embedding = new Float32Array(row.embedding);
                }
                if (row.noteTags) {
                    row.noteTags = row.noteTags.toArray();
                }
            });

            return jsonResults;
        } catch (e) {
            console.error("Failed to search note embedding:", e);
            throw e;
        } finally {
            if (stmt) {
                await stmt.close();
            }
            if (conn) {
                await conn.close();
            }
        }
    }

    /**
     * Deletes all note embedding chunks that have given note UUID.
     * @param {string[]} noteUUIDArr - Array of note UUIDs to delete.
     * @returns {Promise<void>}
     */
    async deleteNoteRecordByNoteUUIDList(noteUUIDArr) {
        if (!noteUUIDArr || noteUUIDArr.length === 0) {
            console.log("No note UUIDs provided to delete. Skipping.");
            return;
        }

        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            const stmt = await conn.prepare('DELETE FROM USER_NOTE_EMBEDDINGS WHERE noteUUID IN ?');
            await stmt.query(JSON.stringify(noteUUIDArr));
            await stmt.close();
        } catch (e) {
            console.error("Failed to delete note embedding:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    /**
     * Deletes all note embedding chunks that do not have a note UUID from the provided list.
     * @param {string[]} noteUUIDArr - Array of note UUIDs to keep.
     * @returns {Promise<void>}
     */
    async deleteNoteRecordByNoteUUIDNotInList(noteUUIDArr) {
        if (!noteUUIDArr || noteUUIDArr.length === 0) {
            console.log("No note UUIDs provided to keep. Skipping to avoid deleting all records.");
            return;
        }

        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            const stmt = await conn.prepare('DELETE FROM USER_NOTE_EMBEDDINGS WHERE noteUUID NOT IN ?');
            await stmt.query(JSON.stringify(noteUUIDArr));
            await stmt.close();
        } catch (e) {
            console.error("Failed to delete note embeddings not in list:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    /**
     * Gets the total count of items. Each note can have multiple records.
     * @returns {Promise<number>} Total count of items
     */
    async getNotesRecordCount() {
        await this.init();
        let conn;
        try {
            conn = await this.db.connect();

            // Count items in notes table
            const notesResult = await conn.query('SELECT COUNT(*)::INTEGER as count FROM USER_NOTE_EMBEDDINGS');
            const totalCount = notesResult.toArray()[0].count;

            return totalCount;
        } catch (error) {
            console.error('Failed to get all notes embeddings count:', error);
            throw error;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    // --------------------------------------------
    // -------------- DB_CONFIG ----------------------
    // --------------------------------------------
    async _getConfigValue(conn, key) {
        let result = null;
        try {
            const stmt = await conn.prepare('SELECT value FROM DB_CONFIG WHERE key = ?');
            result = await stmt.query(String(key));
            await stmt.close();
        } catch (e) {}
        const rows = result ? result.toArray() : [];
        return rows.length > 0 ? rows[0].value : null;
    }

    async _setConfigValue(conn, key, value) {
        const stmt = await conn.prepare('INSERT OR REPLACE INTO DB_CONFIG (key, value) VALUES (?, ?)');
        await stmt.query(String(key), String(value));
        await stmt.close();
    }

    async getConfigValue(key) {
        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            const value = await this._getConfigValue(conn, key);
            return value;
        } catch (e) {
            console.error("Failed to get config value:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    async setConfigValue(key, value) {
        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            await this._setConfigValue(conn, key, value);
            await conn.send(`CHECKPOINT;`);
        } catch (e) {
            console.error("Failed to set config value:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }
}
