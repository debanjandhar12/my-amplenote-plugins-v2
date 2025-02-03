import {openDB} from "idb";
import {COPILOT_CHAT_HISTORY_DB_INDEX_VERSION} from "../../constants.js";

export class CopilotChatHistoryDB {
    async init() {
        if (this.db) return;
        this.db = await openDB('CopilotChatHistoryDB', COPILOT_CHAT_HISTORY_DB_INDEX_VERSION, {
            upgrade(db, oldVersion) {
                // Clear existing data on version change
                db.createObjectStore('threads', {keyPath: 'remoteId'});
            }
        });
    }

    async getAllThreads() {
        await this.init();
        const tx = this.db.transaction('threads');
        const store = tx.objectStore('threads');
        const allThreads = await store.getAll();
        return allThreads.sort((a, b) => b.created - a.created);
    }

    async deleteThread(threadId) {
        await this.init();
        const tx = this.db.transaction('threads', 'readwrite');
        const store = tx.objectStore('threads');
        try {
            await store.delete(threadId);
            await tx.done;
            return true;
        } catch (e) {
            console.error('Failed to delete thread:', e);
            return false;
        }
    }

    async getThread(threadId) {
        await this.init();
        const tx = this.db.transaction('threads');
        const store = tx.objectStore('threads');
        const thread = await store.get(threadId);
        if (!thread) return null;
        return thread;
    }

    async putThread(thread) {
        await this.init();
        const tx = this.db.transaction('threads', 'readwrite');
        const store = tx.objectStore('threads');
        this._validateThread(thread);
        await store.put({
            remoteId: thread.remoteId,
            name: thread.name,
            created: thread.created,
            updated: thread.updated,
            status: thread.status,
            messages: thread.messages
        });
        await tx.done;
    }

    async getLastOpenedThread() {
        const threads = await this.getAllThreads();
        return threads[0] || null;
    }

    _validateThread(thread) {
        if (!thread.remoteId || !thread.name || !thread.created || !thread.updated || !thread.status) {
            throw new Error('Invalid thread object');
        }
        return true;
    }
}