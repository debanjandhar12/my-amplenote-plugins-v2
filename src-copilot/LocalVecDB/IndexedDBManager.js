import {INDEX_VERSION} from "../constants.js";
import {openDB} from "idb";

export class IndexedDBManager {
    async init() {
        if (this.db) return;
        try {
            this.db = await openDB('LocalVecDB', INDEX_VERSION, {
                async upgrade(db, oldVersion, newVersion, transaction) {
                    if (oldVersion !== newVersion) {
                        await new IndexedDBManager().resetDB(db);
                    }
                }
            });
        } catch (e) {
            console.error('IndexedDBManager init error:', e);
        }
    }

    async getAllNotesEmbeddings() {
        await this.init();
        const tx = this.db.transaction('notes');
        const notesObjectStore = tx.objectStore('notes');
        return notesObjectStore.getAll();
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
            db.createObjectStore('config', {keyPath: 'key'});
        } else { // Reset DB called without version upgrade
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
}
