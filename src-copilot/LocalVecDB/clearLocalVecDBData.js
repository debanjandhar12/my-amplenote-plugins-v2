import {OPFSUtils} from "./DuckDB/OPFSUtils.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";
import {DuckDBNotesManager} from "./DuckDB/DuckDBNotesManager.js";

export async function clearLocalVecDBData(app) {
    // Force terminate any active database connections
    await DuckDBConnectionController.forceTerminate();
    
    // Get all files from OPFS and filter for .db and .db.wal files
    const allFiles = await OPFSUtils.getFileList();
    const filesToDelete = allFiles
        .map(file => file.fileName)
        .filter(fileName => fileName.endsWith('.db') || fileName.endsWith('.db.wal'));
    
    const deletedFiles = [];
    for (const fileName of filesToDelete) {
        try {
            const wasDeleted = await OPFSUtils.deleteFile(fileName);
            if (wasDeleted) {
                deletedFiles.push(fileName);
            }
        } catch (error) {
            console.error(`Error deleting ${fileName}:`, error);
            throw new Error(`Failed to delete ${fileName}: ${error.message}`);
        }
    }
    
    return {
        success: true,
        deletedFiles: deletedFiles,
        message: deletedFiles.length > 0 
            ? `Successfully deleted ${deletedFiles.length} database file(s): ${deletedFiles.join(', ')}`
            : 'No database files found to delete'
    };
}