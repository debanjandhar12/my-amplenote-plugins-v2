import {IndexedDBStorageUtils} from "./IndexedDBStorageUtils.js";
import {COPILOT_DB_INDEX_VERSION, MAX_CHAT_HISTORY_THREADS} from "../../constants.js";
import { throttle } from "lodash-es";

/**
 * Manages chat history in LocalStorage with an in-memory cache layer to reduce latency.
 * Reads are served directly from the cache. Writes are applied to the cache immediately
 * and then flushed to LocalStorage asynchronously with a throttle mechanism to prevent data loss.
 */
export class CopilotChatHistoryDB {
    static _instance = null;
    isInitialized = null;

    async _performInit() {
        if (this.isInitialized) return;

        this.fileName = 'copilot-chat-history.json';
        this.indexedDBSupported = null;
        this.threadsCache = {}; // In-memory cache for all threads
        this._scheduleSave = throttle(this._persistCache.bind(this), 1000, { leading: true, trailing: true });

        this.indexedDBSupported = IndexedDBStorageUtils.checkSupport();

        if (this.indexedDBSupported) {
            await this._handleVersionReset();
            const data = await IndexedDBStorageUtils.readJsonFile(this.fileName);
            if (data && data.threads) {
                this.threadsCache = data.threads;
            }
        }

        this.isInitialized = true;
    }

    /**
     * Persists the in-memory cache to LocalStorage.
     * This method is throttled in the constructor.
     * @private
     */
    async _persistCache() {
        if (!this.indexedDBSupported) return;

        try {
            const dataToSave = {
                version: COPILOT_DB_INDEX_VERSION,
                threads: this.threadsCache,
            };
            await IndexedDBStorageUtils.writeJsonFile(this.fileName, dataToSave);
        } catch (error) {
            console.error('Failed to save chat history to IndexedDB:', error);
        }
    }

    async getAllThreads() {
        const threads = Object.values(this.threadsCache);
        return threads.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    }

    async deleteThread(threadId) {
        if (!threadId) return false;

        try {
            if (!this.threadsCache[threadId]) {
                return false; // Thread doesn't exist
            }

            delete this.threadsCache[threadId];
            this._scheduleSave();
            return true;
        } catch (e) {
            console.error('Failed to delete thread:', e);
            return false;
        }
    }

    async getThread(threadId) {
        if (!threadId) return null;
        return this.threadsCache[threadId] || null;
    }

    async putThread(thread) {
        this._validateThread(thread);

        const threads = this.threadsCache;

        // Delete other empty threads before adding/updating the current one
        for (const threadId in threads) {
            if (threadId === thread.remoteId) continue;

            const existingThread = threads[threadId];
            if (!existingThread.messages || !existingThread.messages.messages || existingThread.messages.messages.length === 0) {
                delete threads[threadId];
            }
        }

        threads[thread.remoteId] = {
            remoteId: thread.remoteId,
            name: thread.name,
            created: thread.created,
            updated: thread.updated,
            opened: thread.opened || thread.updated,
            status: thread.status,
            messages: thread.messages,
            enabledToolGroups: thread.enabledToolGroups,
        };

        // Enforce max number of threads
        const threadList = Object.values(threads);
        if (threadList.length > MAX_CHAT_HISTORY_THREADS) {
            threadList.sort((a, b) => new Date(a.updated) - new Date(b.updated));
            const oldestThread = threadList[0];
            delete threads[oldestThread.remoteId];
        }

        this._scheduleSave();
    }

    async getLastOpenedThread() {
        const threads = Object.values(this.threadsCache);
        if (threads.length === 0) return null;
        return threads.sort((a, b) => new Date(b.opened) - new Date(a.opened))[0];
    }

    async getLastUpdatedThread() {
        const threads = await this.getAllThreads();
        return threads[0] || null;
    }

    _validateThread(thread) {
        if (!thread.remoteId || !thread.name || !thread.created || !thread.updated || !thread.status) {
            throw new Error('Invalid thread object');
        }
        if (!Date.parse(thread.created) || !Date.parse(thread.updated)) {
            throw new Error('Invalid date format for created or updated');
        }
        if (thread.opened && !Date.parse(thread.opened)) {
            throw new Error('Invalid date format for opened');
        }
        return true;
    }

    async _handleVersionReset() {
        if (!this.indexedDBSupported) return;

        try {
            const data = await IndexedDBStorageUtils.readJsonFile(this.fileName);

            if (!data) return;

            const currentVersion = data.version || 0;

            if (currentVersion !== COPILOT_DB_INDEX_VERSION) {
                await IndexedDBStorageUtils.deleteFile(this.fileName);
                this.threadsCache = {};
                console.log(`Chat history reset completed due to version change from ${currentVersion} to ${COPILOT_DB_INDEX_VERSION}.`);
            }
        } catch (error) {
            console.error('Error during chat history version check:', error);
        }
    }

    static async getInstance() {
        if (!CopilotChatHistoryDB._instance) {
            CopilotChatHistoryDB._instance = new CopilotChatHistoryDB();
        }

        await CopilotChatHistoryDB._instance._performInit();
        return CopilotChatHistoryDB._instance;
    }
}