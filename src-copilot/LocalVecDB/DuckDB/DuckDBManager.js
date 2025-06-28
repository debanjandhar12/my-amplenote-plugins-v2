import {LOCAL_VEC_DB_INDEX_VERSION} from "../../constants.js";
import DuckDBWorkerManager from "./DuckDBWorkerManager.js";
import {DuckDBDataProtocol} from "@duckdb/duckdb-wasm";

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
            // const root = await navigator.storage.getDirectory();
            // const fileHandle = await root.getFileHandle(`testxx.db`, {create: true});
            // await this.db.registerFileHandle('testxx.db', await fileHandle.getFile(), DuckDBDataProtocol.BROWSER_FSACCESS, true);
            // await conn.query(`EXPORT DATABASE 'testxxz.db'`);
            conn.close();
        } catch (e) {
            console.error('DuckDBManager init error:', e);
            throw e;
        }
    }

    async _createTables(conn) {
        // Notes embeddings table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS NOTE_OBJECTS (
                id VARCHAR PRIMARY KEY,
                actualNoteContentPart TEXT,
                embeddings DOUBLE[],
                headingAnchor VARCHAR,
                isArchived BOOLEAN,
                isPublished BOOLEAN,
                isSharedByMe BOOLEAN,
                isSharedWithMe BOOLEAN,
                isTaskListNote BOOLEAN,
                noteTags VARCHAR[],
                noteTitle VARCHAR,
                noteUUID VARCHAR,
                processedNoteContent TEXT
            )
        `);

        // Create index on noteUUID
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_note_objects_uuid ON NOTE_OBJECTS(noteUUID)
        `);

        // Help center embeddings table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS HELP_CENTER_OBJECTS (
                id VARCHAR PRIMARY KEY,
                actualNoteContentPart TEXT,
                embeddings DOUBLE[],
                headingAnchor VARCHAR,
                isArchived BOOLEAN,
                isPublished BOOLEAN,
                isSharedByMe BOOLEAN,
                isSharedWithMe BOOLEAN,
                isTaskListNote BOOLEAN,
                noteTags VARCHAR[],
                noteTitle VARCHAR,
                noteUUID VARCHAR,
                processedNoteContent TEXT
            )
        `);

        // Create index on noteUUID for help center
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_help_center_objects_uuid ON HELP_CENTER_OBJECTS(noteUUID)
        `);

        // Config table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS CONFIG (
                key VARCHAR PRIMARY KEY,
                value VARCHAR
            )
        `);

        // Create index on key
        await conn.query(`
            CREATE INDEX IF NOT EXISTS idx_config_key ON CONFIG(key)
        `);
    }

    async _resetTables(conn) {
        try {
            await conn.query('DROP TABLE IF EXISTS NOTE_OBJECTS');
            await conn.query('DROP TABLE IF EXISTS HELP_CENTER_OBJECTS');
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
        conn.close();
        console.log('LocalVecDB resetDB');
    }

    /**
     * Transforms a Splitter object to DuckDB format
     */
    _transformSplitterObjectToDuckDB(obj) {
        return {
            id: obj.id,
            actualNoteContentPart: obj.actualNoteContentPart || '',
            embeddings: obj.embeddings ? Array.from(obj.embeddings) : [],
            headingAnchor: obj.headingAnchor || null,
            isArchived: obj.isArchived || false,
            isPublished: obj.isPublished || false,
            isSharedByMe: obj.isSharedByMe || false,
            isSharedWithMe: obj.isSharedWithMe || false,
            isTaskListNote: obj.isTaskListNote || false,
            noteTags: obj.noteTags || [],
            noteTitle: obj.noteTitle || '',
            noteUUID: obj.noteUUID,
            processedNoteContent: obj.processedNoteContent || ''
        };
    }

    /**
     * Transforms a DuckDB object back to Splitter format
     */
    _transformDuckDBObjectToSplitter(obj) {
        return {
            id: obj.id,
            actualNoteContentPart: obj.actualNoteContentPart,
            embeddings: obj.embeddings ? new Float32Array(obj.embeddings) : new Float32Array(),
            headingAnchor: obj.headingAnchor,
            isArchived: obj.isArchived,
            isPublished: obj.isPublished,
            isSharedByMe: obj.isSharedByMe,
            isSharedWithMe: obj.isSharedWithMe,
            isTaskListNote: obj.isTaskListNote,
            noteTags: obj.noteTags || [],
            noteTitle: obj.noteTitle,
            noteUUID: obj.noteUUID,
            processedNoteContent: obj.processedNoteContent
        };
    }

    // --------------------------------------------
    // -------------- NOTE EMBEDDINGS --------------
    // --------------------------------------------
    async getAllNotesEmbeddings() {
        await this.init();

        const conn = await this.db.connect();
        const result = await conn.query('SELECT * FROM NOTE_OBJECTS');
        const rows = result.toArray().map(row => this._transformDuckDBObjectToSplitter(row));
        conn.close();
        
        return rows;
    }

    async getUniqueNoteUUIDsInNoteEmbeddings() {
        await this.init();
        const conn = await this.db.connect();
        const result = await conn.query('SELECT DISTINCT noteUUID FROM NOTE_OBJECTS');
        const uniqueUUIDs = new Set(result.toArray().map(row => row.noteUUID));
        conn.close();
        return uniqueUUIDs;
    }

    /**
     * Inserts / Updates a note embedding in the notes table.
     * @param noteEmbeddingObjArr
     * @returns {Promise<void>}
     */
    async putMultipleNoteEmbedding(noteEmbeddingObjArr) {
        await this.init();
        const conn = await this.db.connect();

        for (const noteEmbeddingObj of noteEmbeddingObjArr) {
            if (!noteEmbeddingObj.id) {
                throw new Error('Each note embedding object must have an "id" property.');
            }
            
            const transformed = this._transformSplitterObjectToDuckDB(noteEmbeddingObj);
            
            // Use INSERT OR REPLACE for upsert functionality
            await conn.query(`
                INSERT OR REPLACE INTO NOTE_OBJECTS (
                    id, actualNoteContentPart, embeddings, headingAnchor, isArchived,
                    isPublished, isSharedByMe, isSharedWithMe, isTaskListNote,
                    noteTags, noteTitle, noteUUID, processedNoteContent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                transformed.id,
                transformed.actualNoteContentPart,
                transformed.embeddings,
                transformed.headingAnchor,
                transformed.isArchived,
                transformed.isPublished,
                transformed.isSharedByMe,
                transformed.isSharedWithMe,
                transformed.isTaskListNote,
                transformed.noteTags,
                transformed.noteTitle,
                transformed.noteUUID,
                transformed.processedNoteContent
            ]);
        }
        conn.close();
    }

    /**
     * Deletes all note embedding chunks that have given note UUID.
     * @param {string[]} noteUUIDArr - Array of note UUIDs to delete.
     * @returns {Promise<void>}
     */
    async deleteNoteEmbeddingByNoteUUIDList(noteUUIDArr) {
        await this.init();
        this.inMemoryNoteStoreCache = null;
        const conn = await this.db.connect();
        
        for (const noteUUID of noteUUIDArr) {
            await conn.query('DELETE FROM NOTE_OBJECTS WHERE noteUUID = $1', [noteUUID]);
        }
        conn.close();
    }

    /**
     * Gets the total count of items in both note and help center tables
     * @returns {Promise<number>} Total count of items
     */
    async getAllNotesEmbeddingsCount() {
        await this.init();
        let totalCount = 0;

        try {
            const conn = await this.db.connect();
            
            // Count items in notes table
            const notesResult = await conn.query('SELECT COUNT(*) as count FROM NOTE_OBJECTS');
            totalCount += notesResult.toArray()[0].count;

            // Count items in help center table
            const helpCenterResult = await conn.query('SELECT COUNT(*) as count FROM HELP_CENTER_OBJECTS');
            totalCount += helpCenterResult.toArray()[0].count;

            conn.close();
            return totalCount;
        } catch (error) {
            console.error('Error getting items count:', error);
            return 0;
        }
    }

    // --------------------------------------------
    // -------------- HELP CENTER EMBEDDING ----------------------
    // --------------------------------------------
    async getAllHelpCenterEmbeddings() {
        await this.init();
        const conn = await this.db.connect();
        const result = await conn.query('SELECT * FROM HELP_CENTER_OBJECTS');
        const rows = result.toArray().map(row => this._transformDuckDBObjectToSplitter(row));
        conn.close();
        return rows;
    }

    async putMultipleHelpCenterEmbeddings(helpCenterEmbeddingObjArr) {
        await this.init();
        const conn = await this.db.connect();

        for (const helpCenterEmbeddingObj of helpCenterEmbeddingObjArr) {
            if (!helpCenterEmbeddingObj.id) {
                throw new Error('Each help center embedding object must have an "id" property.');
            }
            
            const transformed = this._transformSplitterObjectToDuckDB(helpCenterEmbeddingObj);
            
            await conn.query(`
                INSERT OR REPLACE INTO HELP_CENTER_OBJECTS (
                    id, actualNoteContentPart, embeddings, headingAnchor, isArchived,
                    isPublished, isSharedByMe, isSharedWithMe, isTaskListNote,
                    noteTags, noteTitle, noteUUID, processedNoteContent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                transformed.id,
                transformed.actualNoteContentPart,
                transformed.embeddings,
                transformed.headingAnchor,
                transformed.isArchived,
                transformed.isPublished,
                transformed.isSharedByMe,
                transformed.isSharedWithMe,
                transformed.isTaskListNote,
                transformed.noteTags,
                transformed.noteTitle,
                transformed.noteUUID,
                transformed.processedNoteContent
            ]);
        }
        conn.close();
    }

    async clearHelpCenterEmbeddings() {
        await this.init();
        const conn = await this.db.connect();
        await conn.query('DELETE FROM HELP_CENTER_OBJECTS');
        conn.close();
    }

    // --------------------------------------------
    // -------------- CONFIG ----------------------
    // --------------------------------------------
    async _getConfigValue(conn, key) {
        let result = null;
        try {
            const stmt = await conn.prepare('SELECT value FROM CONFIG WHERE key = ?');
            result = await stmt.query(String(key));
        } catch (e) {}
        const rows = result ? result.toArray() : [];
        return rows.length > 0 ? rows[0].value : null;
    }

    async _setConfigValue(conn, key, value) {
        const stmt = await conn.prepare('INSERT OR REPLACE INTO CONFIG (key, value) VALUES (?, ?)');
        await stmt.query(String(key), String(value));
    }

    async getConfigValue(key) {
        await this.init();
        const conn = await this.db.connect();
        const value = await this._getConfigValue(conn, key);
        conn.close();
        return value;
    }

    async setConfigValue(key, value) {
        await this.init();
        const conn = await this.db.connect();
        await this._setConfigValue(conn, key, value);
        conn.close();
    }

    // --------------------------------------------
    // -------------- MISC ----------------------
    // --------------------------------------------

    /**
     * Gets the estimated remaining storage space available
     * @returns {Promise<string>} Storage space information
     */
    async getRemainingStorageSpace() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
                const remainingMB = quotaMB - usedMB;
                return `Used: ${usedMB}MB, Quota: ${quotaMB}MB, Remaining: ${remainingMB}MB`;
            } else {
                return 'Storage estimate not available';
            }
        } catch (error) {
            console.error('Error getting storage space:', error);
            return 'Error getting storage space';
        }
    }
}