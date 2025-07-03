import { DuckDBManager } from "./DuckDB/DuckDBManager.js";
import {IndexedDBManager} from "./IndexedDBManager.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import DuckDBWorkerManager from "./DuckDB/DuckDBWorkerManager.js";

export const getSyncState = async (app, syncNotesPromise = null) => {
    if  (syncNotesPromise) {
        return 'Syncing';
    }

    const dbm = new DuckDBManager();
    await DuckDBWorkerManager.cancelTerminate();
    const lastPluginUUID = await dbm.getConfigValue('lastPluginUUID');
    const lastEmbeddingModel = await dbm.getConfigValue('lastEmbeddingModel');
    const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
    if (lastPluginUUID !== app.context.pluginUUID || lastEmbeddingModel !== embeddingGenerator.MODEL_NAME) {
        DuckDBWorkerManager.scheduleTerminate();
        return 'Not synced';
    }

    const uniqueNoteUUIDs = await dbm.getActualNoteCount();
    const uniqueNoteUUIDsCount = uniqueNoteUUIDs.size;
    if (uniqueNoteUUIDsCount === 0) {
        DuckDBWorkerManager.scheduleTerminate();
        return 'Not synced';
    }
    const allNotes = await app.filterNotes({});
    let lastSyncTime = await dbm.getConfigValue('lastSyncTime')
        || new Date(0).toISOString();
    const targetNotes = allNotes
        // Filter out notes that are already synced
        .filter(note => {
            try {
                const parsedCreatedAt = new Date(note.created || note.createdAt);
                const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
                const parsedLastSyncTime = new Date(lastSyncTime);
                if (parsedCreatedAt == null || parsedUpdatedAt == null) return true;
                return parsedUpdatedAt > parsedLastSyncTime || parsedCreatedAt > parsedLastSyncTime;
            } catch (e) {
                return true;
            }
        });
    if (targetNotes.length >= (allNotes.length/2)) {
        DuckDBWorkerManager.scheduleTerminate();
        return 'Not synced';
    }

    return targetNotes.length === 0 ? 'Fully Synced' : 'Partially synced';
}
