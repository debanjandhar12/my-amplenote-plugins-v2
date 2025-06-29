import {LOCAL_VEC_DB_INDEX_VERSION} from "../../constants.js";
import DuckDBWorkerManager from "./DuckDBWorkerManager.js";
import {OPFSManager} from "./OPFSManager.js";
import {isArray} from "lodash-es";

let instance;
export class DuckDBManager {
    async init() {
        if (this.db) return;
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
                embeddings FLOAT[],
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
                embeddings FLOAT[],
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
    // -------------- NOTE EMBEDDINGS --------------
    // --------------------------------------------
    /**
     * Returns the count of unique notes in the note embeddings table.
     * @returns {Promise<number>}
     */
    async getNoteCountInNoteEmbeddings() {
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
                  id, actualNoteContentPart, embeddings, headingAnchor, isArchived,
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
                if (!noteEmbeddingObj.embeddings) {
                    throw new Error('Note embedding object must have an "embeddings" property.');
                }
                if (typeof noteEmbeddingObj.embeddings === 'string') {
                    throw new Error('Note embedding object "embeddings" property cannot be a string.');
                }
                if (noteEmbeddingObj.noteTags && !isArray(noteEmbeddingObj.noteTags)) {
                    throw new Error('Note embedding object "noteTags" property must be an array of strings.');
                }
                if (noteEmbeddingObj.embeddings instanceof Float32Array ||
                      noteEmbeddingObj.embeddings instanceof Float64Array) {
                  // Convert to array so we can JSON.stringify it
                  noteEmbeddingObj.embeddings = Array.from(noteEmbeddingObj.embeddings);
                }
                await stmt.query(
                    noteEmbeddingObj.id,
                    noteEmbeddingObj.actualNoteContentPart,
                    JSON.stringify(noteEmbeddingObj.embeddings),
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

    async searchNoteEmbedding(embedding, {limit = 10, thresholdSimilarity = 0, isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null} = {}) {
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
                    list_dot_product(embeddings, ?) as similarity
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
                if (row.embeddings) {
                    row.embeddings = row.embeddings.toArray();
                }
                if (!(row.embeddings instanceof Float32Array)) {
                    row.embeddings = new Float32Array(row.embeddings);
                }
                if (row.noteTags) {
                    row.noteTags = row.noteTags.toArray();
                }
            });
            
            return jsonResults;
        } catch (e) {
            console.error("Failed to search note embeddings:", e);
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
    async deleteNoteEmbeddingByNoteUUIDList(noteUUIDArr) {
        if (!noteUUIDArr || noteUUIDArr.length === 0) {
            console.log("No note UUIDs provided to delete. Skipping.");
            return;
        }

        await this.init();
        let conn;
        try {
            conn = await this.db.connect();
            const stmt = await conn.prepare('DELETE FROM USER_NOTE_EMBEDDINGS WHERE noteUUID = ?');
            for (const noteUUID of noteUUIDArr) {
                await stmt.query(noteUUID);
            }
            await stmt.close();
        } catch (e) {
            console.error("Failed to delete note embeddings:", e);
            throw e;
        } finally {
            if (conn) {
                await conn.close();
            }
        }
    }

    /**
     * Gets the total count of items in both note embedding table
     * @returns {Promise<number>} Total count of items
     */
    async getAllNotesEmbeddingsCount() {
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
