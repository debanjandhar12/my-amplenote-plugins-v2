import {LOCAL_VEC_DB_INDEX_VERSION} from "../constants.js";
import {openDB} from "idb";

export class IndexedDBManager {
    async init() {
        if (this.db) return;
        try {
            this.db = await openDB('LocalVecDB', LOCAL_VEC_DB_INDEX_VERSION, {
                async upgrade(db, oldVersion, newVersion, transaction) {
                    if (oldVersion !== newVersion) {
                        await new IndexedDBManager().resetDB(db);
                    }
                },
                blocking() {
                    console.warn('This connection is blocking another connection');
                    // Close the database to allow the other connection to proceed
                    if (this.db) this.db.close();
                }
            });
        } catch (e) {
            console.error('IndexedDBManager init error:', e);
            throw e;
        }
    }

    /**
     * Closes the database connection.
     * This should be called when the database is no longer needed to free up resources.
     * @returns {Promise<void>}
     */
    async closeDB() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Reset the database to its initial state.
     * @param db - Pass the database object if you are doing a version upgrade. Else, don't pass anything.
     * @returns {Promise<void>}
     */
    async resetDB(db) {
        if (db) { // Version upgrade
            // Delete all existing object stores
            for (const storeName of db.objectStoreNames) {
                db.deleteObjectStore(storeName);
            }
            // Create new object stores
            const notesObjectStore = db.createObjectStore('notes', {keyPath: 'id', autoIncrement: false});
            notesObjectStore.createIndex('metadata.noteUUID', 'metadata.noteUUID', {unique: false});
            const helpCenterObjectStore = db.createObjectStore('helpCenter', {keyPath: 'id', autoIncrement: false});
            helpCenterObjectStore.createIndex('metadata.noteUUID', 'metadata.noteUUID', {unique: false});
            db.createObjectStore('config', {keyPath: 'key'});
        } else { // Reset DB called without version upgrade
            await this.init();
            // Truncate all object stores
            const tx = this.db.transaction(this.db.objectStoreNames, 'readwrite');
            for (const storeName of this.db.objectStoreNames) {
                const objectStore = tx.objectStore(storeName);
                await objectStore.clear();
            }
            await tx.done;
        }
        console.log('LocalVecDB resetDB');
    }

    // --------------------------------------------
    // -------------- NOTE EMBEDDINGS --------------
    // --------------------------------------------
    async getAllNotesEmbeddings() {
        await this.init();
        const tx = this.db.transaction('notes');
        const notesObjectStore = tx.objectStore('notes');
        return notesObjectStore.getAll();
    }

    async getUniqueNoteUUIDsInNoteEmbeddings() {
        await this.init();
        const tx = this.db.transaction('notes');
        const notesObjectStore = tx.objectStore('notes');
        const index = notesObjectStore.index('metadata.noteUUID');
        const uniqueUUIDs = new Set();
        let cursor = await index.openCursor();
        while (cursor) {
            uniqueUUIDs.add(cursor.value.metadata.noteUUID);
            cursor = await cursor.continue();
        }
        return uniqueUUIDs;
    }

    /**
     * Inserts / Updates a note embedding in the notes object store.
     * @param noteEmbeddingObjArr
     * @returns {Promise<void>}
     */
    async putMultipleNoteEmbedding(noteEmbeddingObjArr) {
        await this.init();
        const tx = this.db.transaction('notes', 'readwrite');
        const notesObjectStore = tx.objectStore('notes');
        for (const noteEmbeddingObj of noteEmbeddingObjArr) {
            if (!noteEmbeddingObj.id) {
                throw new Error('Each note embedding object must have an "id" property.');
            }
            await notesObjectStore.put(noteEmbeddingObj);
        }
        await tx.done;
    }

    /**
     * Deletes all note embedding chunks that have given note UUID.
     * @param {string} noteUUIDArr - Array of note UUIDs to delete.
     * @returns {Promise<void>}
     */
    async deleteNoteEmbeddingByNoteUUIDList(noteUUIDArr) {
        await this.init();
        const tx = this.db.transaction('notes', 'readwrite');
        const notesObjectStore = tx.objectStore('notes');
        const index = notesObjectStore.index('metadata.noteUUID');
        for (const noteUUID of noteUUIDArr) {
            let cursor = await index.openCursor(IDBKeyRange.only(noteUUID));
            while (cursor) {
                await cursor.delete();
                cursor = await cursor.continue();
            }
        }
        await tx.done;
    }

    // --------------------------------------------
    // -------------- HELP CENTER EMBEDDING ----------------------
    // --------------------------------------------
    async getAllHelpCenterEmbeddings() {
        await this.init();
        const tx = this.db.transaction('helpCenter');
        const helpCenterObjectStore = tx.objectStore('helpCenter');
        return helpCenterObjectStore.getAll();
    }

    async putMultipleHelpCenterEmbeddings(helpCenterEmbeddingObjArr) {
        await this.init();
        const tx = this.db.transaction('helpCenter', 'readwrite');
        const helpCenterObjectStore = tx.objectStore('helpCenter');
        for (const helpCenterEmbeddingObj of helpCenterEmbeddingObjArr) {
            if (!helpCenterEmbeddingObj.id) {
                throw new Error('Each note embedding object must have an "id" property.');
            }
            await helpCenterObjectStore.put(helpCenterEmbeddingObj);
        }
        await tx.done;
    }

    async clearHelpCenterEmbeddings() {
        await this.init();
        const tx = this.db.transaction('helpCenter', 'readwrite');
        const helpCenterObjectStore = tx.objectStore('helpCenter');
        await helpCenterObjectStore.clear();
        await tx.done;
    }

    // --------------------------------------------
    // -------------- CONFIG ----------------------
    // --------------------------------------------
    async getConfigValue(key) {
        await this.init();
        const tx = this.db.transaction('config');
        const configObjectStore = tx.objectStore('config');
        const value = (await configObjectStore.get(key))?.value;
        await tx.done;
        return value;
    }

    async setConfigValue(key, value) {
        await this.init();
        const tx = this.db.transaction('config', 'readwrite');
        const configObjectStore = tx.objectStore('config');
        await configObjectStore.put({key, value});
        await tx.done;
    }
}
