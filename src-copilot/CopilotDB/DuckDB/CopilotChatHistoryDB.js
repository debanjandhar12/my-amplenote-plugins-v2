import {OPFSUtils} from "./OPFSUtils.js";
import {COPILOT_DB_INDEX_VERSION, MAX_CHAT_HISTORY_THREADS} from "../../constants.js";
import { throttle } from "lodash-es";

/**
 * Manages chat history in OPFS with an in-memory cache layer to reduce latency.
 * Reads are served directly from the cache. Writes are applied to the cache immediately
 * and then flushed to the OPFS file asynchronously with a throttle mechanism to prevent data loss.
 */
export class CopilotChatHistoryDB {
    constructor() {
        this.fileName = 'copilot-chat-history.json';
        this.initialized = false;
        this.opfsSupported = null;
        this.threadsCache = null; // In-memory cache for all threads
        this._scheduleSave = throttle(this._persistCache.bind(this), 1000, { leading: true, trailing: true });
    }

    async init() {
        if (this.initialized) return;

        this.opfsSupported = await OPFSUtils.checkSupport();

        if (this.opfsSupported) {
            await this._handleVersionReset();
            const data = await OPFSUtils.readJsonFile(this.fileName);
            // The data can be in the new format { version, threads } or old format (just threads object)
            if (data && data.threads) {
                this.threadsCache = data.threads;
            } else {
                this.threadsCache = data || {};
            }
        } else {
            console.warn('OPFS not supported, using in-memory storage for chat history. Data will be lost on page refresh.');
            this.threadsCache = {};
        }

        this.initialized = true;
    }

    /**
     * Persists the in-memory cache to the OPFS file.
     * This method is throttled in the constructor.
     * @private
     */
    async _persistCache() {
        if (!this.opfsSupported) return;

        try {
            const dataToSave = {
                version: COPILOT_DB_INDEX_VERSION,
                threads: this.threadsCache,
            };
            await OPFSUtils.writeJsonFile(this.fileName, dataToSave);
        } catch (error) {
            console.error('Failed to save chat history to OPFS:', error);
        }
    }

    async getAllThreads() {
        await this.init();
        const threads = Object.values(this.threadsCache);
        return threads.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    }

    async deleteThread(threadId) {
        if (!threadId) return false;

        try {
            await this.init();

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
        await this.init();
        return this.threadsCache[threadId] || null;
    }

    async putThread(thread) {
        this._validateThread(thread);
        await this.init();

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
            status: thread.status,
            messages: thread.messages,
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
        return true;
    }

    async _handleVersionReset() {
        if (!this.opfsSupported) return;

        try {
            const data = await OPFSUtils.readJsonFile(this.fileName);

            if (!data) return;

            const currentVersion = data.version || 0;

            if (currentVersion !== COPILOT_DB_INDEX_VERSION) {
                await OPFSUtils.deleteFile(this.fileName);
                console.log(`Chat history reset completed due to version change from ${currentVersion} to ${COPILOT_DB_INDEX_VERSION}.`);
            }
        } catch (error) {
            console.error('Error during chat history version check:', error);
        }
    }
}