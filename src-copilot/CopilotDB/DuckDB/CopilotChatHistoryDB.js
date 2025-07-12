import {OPFSUtils} from "./OPFSUtils.js";
import {COPILOT_DB_INDEX_VERSION, MAX_CHAT_HISTORY_THREADS} from "../../constants.js";

/**
 * This does not use duckdb. It uses a simple JSON file and stores it in OPFS.
 */
export class CopilotChatHistoryDB {
    constructor() {
        this.fileName = 'copilot-chat-history.json';
        this.initialized = false;
        this.opfsSupported = null;
        this.inMemoryStorage = new Map(); // Fallback for when OPFS is not supported
    }

    async init() {
        if (this.initialized) return;

        // Check OPFS support once
        this.opfsSupported = await OPFSUtils.checkSupport();

        if (!this.opfsSupported) {
            console.warn('OPFS not supported, using in-memory storage for chat history');
        } else {
            // Check and handle version changes for OPFS
            await this._handleVersionReset();
        }

        this.initialized = true;
    }

    async _getThreadsData() {
        await this.init();

        if (!this.opfsSupported) {
            // Return in-memory storage as an object
            const threadsMap = {};
            for (const [key, value] of this.inMemoryStorage) {
                threadsMap[key] = value;
            }
            return threadsMap;
        }

        const data = await OPFSUtils.readJsonFile(this.fileName);
        if (!data) {
            return { version: COPILOT_DB_INDEX_VERSION, threads: {} };
        }

        // Ensure we have the version and threads structure
        if (!data.version || !data.threads) {
            return { version: COPILOT_DB_INDEX_VERSION, threads: data };
        }

        return data;
    }

    async _saveThreadsData(threadsData) {
        await this.init();

        if (!this.opfsSupported) {
            // Save to in-memory storage (only thread data, not version)
            this.inMemoryStorage.clear();
            const threads = threadsData.threads || threadsData;
            for (const [key, value] of Object.entries(threads)) {
                this.inMemoryStorage.set(key, value);
            }
            return true;
        }

        // Ensure we save with version structure
        const dataToSave = {
            version: COPILOT_DB_INDEX_VERSION,
            threads: threadsData.threads || threadsData
        };

        return await OPFSUtils.writeJsonFile(this.fileName, dataToSave);
    }

    async getAllThreads() {
        const threadsData = await this._getThreadsData();
        const threads = Object.values(threadsData.threads || threadsData);
        return threads.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    }

    async deleteThread(threadId) {
        if (!threadId) return false;

        try {
            const threadsData = await this._getThreadsData();
            const threads = threadsData.threads || threadsData;

            if (!threads[threadId]) {
                return false; // Thread doesn't exist
            }

            delete threads[threadId];
            await this._saveThreadsData(threadsData);
            return true;
        } catch (e) {
            console.error('Failed to delete thread:', e);
            return false;
        }
    }

    async getThread(threadId) {
        if (!threadId) return null;

        const threadsData = await this._getThreadsData();
        const threads = threadsData.threads || threadsData;
        return threads[threadId] || null;
    }

    async putThread(thread) {
        this._validateThread(thread);

        const threadsData = await this._getThreadsData();
        const threads = threadsData.threads || threadsData;

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
            messages: thread.messages
        };

        // Enforce max number of threads
        const threadList = Object.values(threads);
        if (threadList.length > MAX_CHAT_HISTORY_THREADS) {
            threadList.sort((a, b) => new Date(a.updated) - new Date(b.updated));
            const oldestThread = threadList[0];
            delete threads[oldestThread.remoteId];
        }

        await this._saveThreadsData(threadsData);
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
