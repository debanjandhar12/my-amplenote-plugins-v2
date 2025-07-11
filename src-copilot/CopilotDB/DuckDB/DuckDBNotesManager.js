import {COPILOT_DB_INDEX_VERSION} from "../../constants.js";
import DuckDBConnectionController from "./DuckDBConnectionController.js";
import {OPFSUtils} from "./OPFSUtils.js";
import {isArray, truncate} from "lodash-es";
import { eng } from "stopword";

let instance;
export class DuckDBNotesManager {
    static dbFileName = 'CopilotNotesDB';

    async init() {
        if (this.db && !DuckDBConnectionController.isTerminated()) return;
        try {
            this.db = await DuckDBConnectionController.getCollectionInstance(DuckDBNotesManager.dbFileName, {persistent: true});
            const conn = await this.db.connect();

            // Check if we need to reset the database due to version change
            const currentVersion = await this._getConfigValue(conn, 'COPILOT_DB_INDEX_VERSION');
            if (currentVersion !== String(COPILOT_DB_INDEX_VERSION)) {
                await this._resetTables(conn);
                await this._createTables(conn);
                await this._setConfigValue(conn, 'COPILOT_DB_INDEX_VERSION', COPILOT_DB_INDEX_VERSION);
                await conn.query(`CHECKPOINT`);
            }

            await conn.close();
            if (await OPFSUtils.doesFileExists(`${DuckDBNotesManager.dbFileName}.db`) === false) {
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
            CREATE TABLE IF NOT EXISTS user_note_embeddings (
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
            CREATE INDEX IF NOT EXISTS idx_user_note_embeddings_uuid ON user_note_embeddings(noteUUID)
        `);

        // Config table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS db_config (
                key VARCHAR PRIMARY KEY,
                value VARCHAR
            )
        `);

        // Create index on key
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_db_config_key ON db_config(key)
        `);
    }

    async _resetTables(conn) {
        try {
            await conn.query('DROP TABLE IF EXISTS db_config');
            await conn.query('DROP TABLE IF EXISTS user_note_embeddings');
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
        await this._setConfigValue(conn, 'COPILOT_DB_INDEX_VERSION', COPILOT_DB_INDEX_VERSION);
        await conn.query(`CHECKPOINT;`);
        conn.close();
        console.log('CopilotDB resetDB');
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
            const result = await conn.query('SELECT approx_count_distinct(DISTINCT noteUUID)::INTEGER AS count FROM user_note_embeddings');
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
              INSERT OR REPLACE INTO user_note_embeddings (
                  id, actualNoteContentPart, embedding, headingAnchor, isArchived,
                  isPublished, isSharedByMe, isSharedWithMe, isTaskListNote,
                  noteTags, noteTitle, noteUUID, processedNoteContent
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
        for (const [index, noteEmbeddingObj] of noteEmbeddingObjArr.entries()) {
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
                    message: `Failed to process item at index ${index} (id: ${noteEmbeddingObj.id || 'N/A'})` +
                             `Error Reason: ${e?.message}`,
                    cause: e,
                    item: noteEmbeddingObj
                });
            }
        }
        if (errors.length > 0) {
            try {
                await conn.query('ROLLBACK');
                await stmt.close();
                conn.close();
            } catch (e) {console.warn(e)}
            throw errors[0];
        }
        await conn.query('COMMIT');
        await conn.query(`CHECKPOINT`);
        await stmt.close();
        conn.close();
    }

    // async searchNoteRecordByEmbedding(embedding, {limit = 10, thresholdSimilarity = 0, isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null} = {}) {
    //     await this.init();
    //     let conn;
    //     let stmt;
    //
    //     try {
    //         conn = await this.db.connect();
    //
    //         // Build WHERE clause conditions
    //         const conditions = ['similarity > ?'];
    //         const params = [];
    //
    //         if (isArchived !== null) {
    //             conditions.push('isArchived = ?');
    //             params.push(isArchived);
    //         }
    //         if (isSharedByMe !== null) {
    //             conditions.push('isSharedByMe = ?');
    //             params.push(isSharedByMe);
    //         }
    //         if (isSharedWithMe !== null) {
    //             conditions.push('isSharedWithMe = ?');
    //             params.push(isSharedWithMe);
    //         }
    //         if (isTaskListNote !== null) {
    //             conditions.push('isTaskListNote = ?');
    //             params.push(isTaskListNote);
    //         }
    //
    //         const whereClause = conditions.join(' AND ');
    //
    //         stmt = await conn.prepare(`
    //             SELECT
    //                 *,
    //                 list_dot_product(embedding, ?) AS similarity
    //             FROM
    //                 user_note_embeddings
    //             WHERE
    //                 ${whereClause}
    //             ORDER BY
    //                 similarity DESC
    //             LIMIT ?;
    //         `);
    //
    //         if (embedding instanceof Float32Array || embedding instanceof Float64Array) {
    //             // Convert to array so we can JSON.stringify it
    //             embedding = Array.from(embedding);
    //         }
    //         if (!isArray(embedding)) {
    //             throw new Error('Embedding must be an array of numbers.');
    //         }
    //
    //         const results = await stmt.query(JSON.stringify(embedding), thresholdSimilarity, ...params, limit);
    //         let jsonResults = results.toArray().map(row => row.toJSON());
    //         jsonResults.forEach(row => {
    //             if (row.embedding) {
    //                 row.embedding = row.embedding.toArray();
    //             }
    //             if (!(row.embedding instanceof Float32Array)) {
    //                 row.embedding = new Float32Array(row.embedding);
    //             }
    //             if (row.noteTags) {
    //                 row.noteTags = row.noteTags.toArray();
    //             }
    //         });
    //
    //         return jsonResults;
    //     } catch (e) {
    //         console.error("Failed to search note embedding:", e);
    //         throw e;
    //     } finally {
    //         if (stmt) {
    //             await stmt.close();
    //         }
    //         if (conn) {
    //             await conn.close();
    //         }
    //     }
    // }

    /**
     * Search note records by RRF (Reciprocal Ranked Fusion).
     * This method combines results from a full-text search (BM25) and a vector similarity search.
     * @param {string} query The text query for the full-text search.
     * @param {Array<number>|Float32Array|Float64Array} embedding The query embedding for the vector search.
     * @param {object} options Search options.
     */
    async searchNoteRecordByRRF(query, embedding, {limit = 10, thresholdSimilarity = 0, isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null} = {}) {
        await this.init();
        let conn;
        let stmt;

        try {
            conn = await this.db.connect();

            // Build WHERE clause conditions for initial filtering
            const conditions = [];
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

            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
            const ftsScanLimit = 160;

            stmt = await conn.prepare(`
                WITH
                    query_stems AS (
                        -- 1. Pre-process the search query string
                        SELECT list_distinct(
                                list_transform(
                                    list_filter(
                                        string_split(
                                            regexp_replace(
                                                regexp_replace(lower(?), '[^a-z0-9\s]', ' ', 'g'),
                                                '\s+', ' ', 'g'
                                            ),
                                            ' '
                                        ),
                                        word -> word IS NOT NULL AND length(trim(word)) > 1 AND
                                            -- remove stop words
                                            NOT list_contains([${eng.map(word => `'${word.replace(/'/g, "''")}'`).join(',')}], word) AND
                                            -- only include words with at least one alphabetic character
                                            regexp_matches(word, '[a-z]')
                                    ),
                                    x -> stem(x, 'porter')
                                )
                            ) AS stems
                    ),
                    -- 2. Get top embedding matches with initial filtering
                    embed_candidates AS (
                        SELECT
                            id,
                            actualNoteContentPart,
                            embedding,
                            headingAnchor,
                            isSharedByMe,
                            isSharedWithMe,
                            isTaskListNote,
                            noteTags,
                            noteTitle,
                            noteUUID,
                            processedNoteContent,
                            list_dot_product(embedding, ?) AS embedding_similarity,
                            ROW_NUMBER() OVER (
                                ORDER BY
                                    embedding_similarity DESC
                            ) AS embed_rank
                        FROM
                            user_note_embeddings ${whereClause}
                        ORDER BY
                            embedding_similarity DESC
                        LIMIT ?
                    ),
                    -- 3. Calculate document stems for IDF computation
                    candidate_doc_stems AS (
                        SELECT
                            id,
                            list_distinct(
                                list_transform(
                                    list_filter(
                                        string_split(
                                            regexp_replace(
                                                regexp_replace(lower(COALESCE(processedNoteContent, '')), '[^a-z0-9\s]', ' ', 'g'),
                                                '\s+', ' ', 'g'
                                            ),
                                            ' '
                                        ),
                                        word -> word IS NOT NULL AND length(trim(word)) > 1 AND
                                            -- remove stop words
                                            NOT list_contains([${eng.map(word => `'${word.replace(/'/g, "''")}'`).join(',')}], word) AND
                                            -- only include words with at least one alphabetic character
                                            regexp_matches(word, '[a-z]')
                                    ),
                                    x -> stem(x, 'porter')
                                )
                            ) AS doc_stems
                        FROM
                            embed_candidates
                    ),
                    -- 4. Calculate smoothened IDF scores for query terms
                    candidate_doc_count AS (
                        SELECT COUNT(*) AS total_docs FROM candidate_doc_stems
                    ),
                    query_term_idf AS (
                        SELECT
                            q.stem,
                            -- Smoothed IDF formula: log((N + 1.0) / (df + 1.0)) + 1.0
                            log((cdc.total_docs + 1.0) / (COUNT(cds.id) + 1.0)) + 1.0 AS idf_score
                        FROM
                            (SELECT unnest(stems) AS stem FROM query_stems) AS q
                        CROSS JOIN
                            candidate_doc_count cdc
                        LEFT JOIN
                            candidate_doc_stems cds ON list_contains(cds.doc_stems, q.stem)
                        GROUP BY
                            q.stem, cdc.total_docs
                    ),
                    -- 5. Calculate scores for all candidates
                    fts_scored AS (
                        SELECT
                            ec.*,
                            cds.doc_stems,
                            (SELECT stems FROM query_stems) AS query_stems,
                            COALESCE((
                                SELECT
                                    SUM(qti.idf_score)
                                FROM
                                    query_term_idf qti
                                WHERE
                                    list_contains(cds.doc_stems, qti.stem)
                            ), 0) AS fts_score
                        FROM
                            embed_candidates ec
                            JOIN candidate_doc_stems cds ON ec.id = cds.id
                    ),
                    -- 6. Calculate Ranks
                    ranked_scores AS (
                        SELECT
                            *,
                            ROW_NUMBER() OVER (
                                ORDER BY
                                    fts_score DESC,
                                    embedding_similarity DESC
                            ) as fts_rank
                        FROM
                            fts_scored
                        WHERE
                            embedding_similarity > ?
                    ),
                    -- 7. Calculate Final RRF Score
                    final_scores AS (
                        SELECT
                            *,
                            (
                                (0.45 * COALESCE(1.0 / (60 + fts_rank), 0)) + (0.55 * COALESCE(1.0 / (60 + embed_rank), 0))
                            ) * (61 / 2) AS similarity
                        FROM
                            ranked_scores
                    )
                SELECT
                    id,
                    actualNoteContentPart,
                    embedding,
                    headingAnchor,
                    isSharedByMe,
                    isSharedWithMe,
                    isTaskListNote,
                    noteTags,
                    noteTitle,
                    noteUUID,
                    processedNoteContent,
                    embedding_similarity,
                    fts_score,
                    similarity,
                    -- Debug information
                    -- doc_stems,
                    -- query_stems,
                    -- embed_rank,
                    -- fts_rank
                FROM
                    final_scores
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

            const embeddingStr = JSON.stringify(embedding);
            const results = await stmt.query(
                truncate(query, {length: 128}),
                embeddingStr,
                ...params,
                ftsScanLimit,
                thresholdSimilarity,
                limit
            );

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
                if (row.doc_stems) {
                    row.doc_stems = row.doc_stems.toArray();
                }
                if (row.query_stems) {
                    row.query_stems = row.query_stems.toArray();
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

    // async updateFTSIndex() {
    //     await this.init();
    //     let conn;
    //     try {
    //       conn = await this.db.connect();
    //       const isUpdated = await this._getConfigValue(conn, 'lastSyncTime') === await this._getConfigValue(conn, 'lastFTSIndexTime');
    //       if (!isUpdated) {
    //         await conn.query(`PRAGMA create_fts_index('USER_NOTE_EMBEDDINGS', 'id', input_values:='processedNoteContent', overwrite:=1)`);
    //         await this._setConfigValue(conn, 'lastFTSIndexTime', await this._getConfigValue(conn, 'lastSyncTime'));
    //         await conn.query(`CHECKPOINT;`);
    //       }
    //     }
    //     catch (e) {
    //       conn.close();
    //       throw e;
    //     }
    // }

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
            const stmt = await conn.prepare('DELETE FROM user_note_embeddings WHERE noteUUID IN ?');
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
            const stmt = await conn.prepare('DELETE FROM user_note_embeddings WHERE noteUUID NOT IN ?');
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
            const notesResult = await conn.query('SELECT COUNT(*)::INTEGER AS count FROM user_note_embeddings');
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
            const stmt = await conn.prepare('SELECT value FROM db_config WHERE key = ?');
            result = await stmt.query(String(key));
            await stmt.close();
        } catch (e) {}
        const rows = result ? result.toArray() : [];
        return rows.length > 0 ? rows[0].value : null;
    }

    async _setConfigValue(conn, key, value) {
        const stmt = await conn.prepare('INSERT OR REPLACE INTO db_config (key, value) VALUES (?, ?)');
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
            await conn.query(`CHECKPOINT;`);
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
