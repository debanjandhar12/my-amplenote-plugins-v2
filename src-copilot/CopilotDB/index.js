// **
// ** CopilotDB - Modular vector database implementation based on IndexedDB
// **
import {syncNotes as _syncNotes} from "./syncNotes.js";
import {searchNotes as _searchNotes} from "./searchNotes.js";
import {searchHelpCenter as _searchHelpCenter} from "./searchHelpCenter.js";
import {getSyncState as _getSyncState} from "./getSyncState.js";
import {clearCopilotDBData as _clearCopilotDBData} from "./clearCopilotDBData.js";
import {CopilotChatHistoryDB} from "./JsonDB/CopilotChatHistoryDB.js";

// Singleton pattern for syncNotes - maintain global state
let syncNotesPromise = null;

// Singleton instance for chat history DB
let chatHistoryDB = null;
const getChatHistoryDB = () => {
    if (!chatHistoryDB) {
        chatHistoryDB = new CopilotChatHistoryDB();
    }
    return chatHistoryDB;
};

/**
 * Search notes using natural language query
 * @param {Object} app - Amplenote app instance
 * @param {string} query - Search query
 * @param {string} queryTextType - Type of query text
 * @param {Object} opts - Search options
 * @returns {Promise<Array>} Search results
 */
export const searchNotes = async (app, query, queryTextType, opts) => {
    return await _searchNotes(app, query, queryTextType, opts);
};

/**
 * Sync notes with CopilotDB - singleton pattern ensures only one sync at a time
 * @param {Object} app - Amplenote app instance
 * @param {Function} sendMessageToEmbed - Function to send progress messages
 * @returns {Promise<boolean>} Success status
 */
export const syncNotes = async (app, sendMessageToEmbed) => {
    // If there's no active sync promise, create one
    if (!syncNotesPromise) {
        syncNotesPromise = _syncNotes(app, sendMessageToEmbed)
            .finally(() => {
                syncNotesPromise = null;
            });
    }

    // Return the currently active sync promise
    return syncNotesPromise;
};

/**
 * Get current sync state
 * @param {Object} app - Amplenote app instance
 * @returns {Promise<string>} Sync state
 */
export const getSyncState = async (app) => {
    return await _getSyncState(app, syncNotesPromise);
};

/**
 * Search help center using natural language query
 * @param {Object} app - Amplenote app instance
 * @param {string} query - Search query
 * @param {Object} opts - Search options
 * @returns {Promise<Array>} Search results
 */
export const searchHelpCenter = async (app, query, opts) => {
    return await _searchHelpCenter(app, query, opts);
};

/**
 * Clear all CopilotDB data from OPFS
 * @param {Object} app - Amplenote app instance
 * @returns {Promise<Object>} Result object with success status and details
 */
export const clearCopilotDBData = async (app) => {
    return await _clearCopilotDBData(app);
};

/**
 * Get all chat threads sorted by last updated date
 * @returns {Promise<Array>} Array of thread objects sorted by updated date (newest first)
 */
export const getAllChatThreads = async () => {
    const db = getChatHistoryDB();
    return await db.getAllThreads();
};

/**
 * Delete a chat thread
 * @param {string} threadId - The ID of the thread to delete
 * @returns {Promise<boolean>} True if deleted successfully, false if thread not found
 */
export const deleteChatThread = async (threadId) => {
    const db = getChatHistoryDB();
    return await db.deleteThread(threadId);
};

/**
 * Get a specific chat thread
 * @param {string} threadId - The ID of the thread to retrieve
 * @returns {Promise<Object|null>} Thread object or null if not found
 */
export const getChatThread = async (threadId) => {
    const db = getChatHistoryDB();
    return await db.getThread(threadId);
};

/**
 * Save or update a chat thread
 * @param {Object} thread - The thread object to save
 * @returns {Promise<void>}
 */
export const saveChatThread = async (thread) => {
    const db = getChatHistoryDB();
    return await db.putThread(thread);
};

/**
 * Get the most recently updated chat thread
 * @returns {Promise<Object|null>} Most recent thread object or null if no threads exist
 */
export const getLastUpdatedChatThread = async () => {
    const db = getChatHistoryDB();
    return await db.getLastUpdatedThread();
};

// Export all functions as default object for backwards compatibility
export default {
    searchNotes,
    syncNotes,
    getSyncState,
    searchHelpCenter,
    clearCopilotDBData,
    getAllChatThreads,
    deleteChatThread,
    getChatThread,
    saveChatThread,
    getLastUpdatedChatThread
};