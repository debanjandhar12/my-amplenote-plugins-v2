import {OPFSUtils} from "./DuckDB/OPFSUtils.js";
import {IndexedDBStorageUtils} from "./DuckDB/IndexedDBStorageUtils.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";
import {CopilotChatHistoryDB} from "./DuckDB/CopilotChatHistoryDB.js";

export async function clearCopilotDBData(app) {
    // Force terminate any active database connections
    await DuckDBConnectionController.forceTerminate();
    
    const deletedFiles = [];

    // Get all files from OPFS and filter for .db, .db.wal files, and chat history
    const allFiles = await OPFSUtils.getFileList();
    const filesToDelete = allFiles
        .map(file => file.fileName)
        .filter(fileName => fileName.endsWith('.db') || fileName.endsWith('.db.wal') || fileName === 'copilot-chat-history.json');
    
    for (const fileName of filesToDelete) {
        try {
            const wasDeleted = await OPFSUtils.deleteFile(fileName);
            if (wasDeleted) {
                deletedFiles.push(`${fileName} (opfs)`);
            }
        } catch (error) {
            console.error(`Error deleting ${fileName}:`, error);
            throw new Error(`Failed to delete ${fileName}: ${error.message}`);
        }
    }


    // Clear IndexedDB data (chat history)
    const indexedDBFiles = await IndexedDBStorageUtils.getFileList();
    for (const file of indexedDBFiles) {
        try {
            const wasDeleted = await IndexedDBStorageUtils.deleteFile(file.fileName);
            if (wasDeleted) {
                deletedFiles.push(`${file.fileName} (indexeddb)`);
            }
        } catch (error) {
            console.error(`Error deleting IndexedDB key ${file.fileName}:`, error);
            throw new Error(`Failed to delete IndexedDB key ${file.fileName}: ${error.message}`);
        }
    }
    (await CopilotChatHistoryDB.getInstance()).threadsCache = {}; // clear chat history cache too
    
    return {
        success: true,
        deletedFiles: deletedFiles,
        message: deletedFiles.length > 0 
            ? `Successfully deleted ${deletedFiles.length} item(s): ${deletedFiles.join(', ')}`
            : 'No CopilotDB data found to delete'
    };
}