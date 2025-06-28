import {LOCAL_VEC_DB_INDEX_VERSION} from "../constants.js";
import {openDB} from "idb";
import {debounce} from "lodash-es";

let instance;
export class IndexedDBManager {
    constructor() {
        if (instance) return instance;
        instance = this;
        this.clearInMemoryNoteStoreCache = debounce(() => {
            this.inMemoryNoteStoreCache = null;
        }, 60000);
        return instance;
    }

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
            this.clearInMemoryNoteStoreCache();
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
            notesObjectStore.createIndex('noteUUID', 'noteUUID', {unique: false});
            const helpCenterObjectStore = db.createObjectStore('helpCenter', {keyPath: 'id', autoIncrement: false});
            helpCenterObjectStore.createIndex('noteUUID', 'noteUUID', {unique: false});
            db.createObjectStore('config', {keyPath: 'key'});
        } else { // Reset DB called without a version upgrade
            await this.init();
            this.inMemoryNoteStoreCache = null;
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
        if (this.inMemoryNoteStoreCache) return this.inMemoryNoteStoreCache;
        this.inMemoryNoteStoreCache = notesObjectStore.getAll();
        return this.inMemoryNoteStoreCache;
    }

    async getUniqueNoteUUIDsInNoteEmbeddings() {
        await this.init();
        const tx = this.db.transaction('notes');
        const notesObjectStore = tx.objectStore('notes');
        const index = notesObjectStore.index('noteUUID');
        const uniqueUUIDs = new Set();
        let cursor = await index.openCursor();
        while (cursor) {
            uniqueUUIDs.add(cursor.value.noteUUID);
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
        this.inMemoryNoteStoreCache = null;
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
        this.inMemoryNoteStoreCache = null;
        const tx = this.db.transaction('notes', 'readwrite');
        const notesObjectStore = tx.objectStore('notes');
        const index = notesObjectStore.index('noteUUID');
        for (const noteUUID of noteUUIDArr) {
            let cursor = await index.openCursor(IDBKeyRange.only(noteUUID));
            while (cursor) {
                await cursor.delete();
                cursor = await cursor.continue();
            }
        }
        await tx.done;
    }

    /**
     * Gets the total count of items in notes object store
     * @returns {Promise<number>} Total count of items
     */
    async getAllNotesEmbeddingsCount() {
        await this.init();
        let totalCount = 0;

        try {
            // Count items in notes store
            const notesTx = this.db.transaction('notes');
            const notesStore = notesTx.objectStore('notes');
            totalCount += await notesStore.count();

            // Count items in helpCenter store
            const helpCenterTx = this.db.transaction('helpCenter');
            const helpCenterStore = helpCenterTx.objectStore('helpCenter');
            totalCount += await helpCenterStore.count();

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
