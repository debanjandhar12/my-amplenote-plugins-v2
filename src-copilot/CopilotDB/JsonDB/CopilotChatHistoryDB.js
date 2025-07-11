import {OPFSUtils} from "../DuckDB/OPFSUtils.js";
import {COPILOT_CHAT_HISTORY_DB_INDEX_VERSION} from "../../constants.js";

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
        return data || {};
    }

    async _saveThreadsData(threadsData) {
        await this.init();
        
        if (!this.opfsSupported) {
            // Save to in-memory storage
            this.inMemoryStorage.clear();
            for (const [key, value] of Object.entries(threadsData)) {
                this.inMemoryStorage.set(key, value);
            }
            return true;
        }

        return await OPFSUtils.writeJsonFile(this.fileName, threadsData);
    }

    async getAllThreads() {
        const threadsData = await this._getThreadsData();
        const threads = Object.values(threadsData);
        return threads.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    }

    async deleteThread(threadId) {
        if (!threadId) return false;
        
        try {
            const threadsData = await this._getThreadsData();
            
            if (!threadsData[threadId]) {
                return false; // Thread doesn't exist
            }
            
            delete threadsData[threadId];
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
        return threadsData[threadId] || null;
    }

    async putThread(thread) {
        this._validateThread(thread);
        
        const threadsData = await this._getThreadsData();
        
        threadsData[thread.remoteId] = {
            remoteId: thread.remoteId,
            name: thread.name,
            created: thread.created,
            updated: thread.updated,
            status: thread.status,
            messages: thread.messages
        };
        
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
}