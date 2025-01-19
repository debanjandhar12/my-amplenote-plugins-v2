import {getEmbeddingConfig} from "./embeddings/getEmbeddingConfig.js";
import {IndexedDBManager} from "./IndexedDBManager.js";

export const getSyncState = async (app) => {
    const indexedDBManager = new IndexedDBManager();
    const embeddingConfig = await getEmbeddingConfig(app);
    const lastPluginUUID = await indexedDBManager.getConfigValue('lastPluginUUID');
    const lastEmbeddingModel = await indexedDBManager.getConfigValue('lastEmbeddingModel');
    if (lastPluginUUID !== app.context.pluginUUID || lastEmbeddingModel !== embeddingConfig.model) {
        return 'Not synced';
    }

    const uniqueNoteUUIDs = await indexedDBManager.getUniqueNoteUUIDsInNoteEmbeddings();
    const uniqueNoteUUIDsCount = uniqueNoteUUIDs.size;
    if (uniqueNoteUUIDsCount === 0) {
        return 'Not synced';
    }
    const allNotes = await app.filterNotes({});
    let lastSyncTime = await indexedDBManager.getConfigValue('lastSyncTime')
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
    if (targetNotes.length >= (allNotes.length/4)) {
        return 'Not synced';
    }

    return targetNotes.length === 0 ? 'Fully Synced' : 'Partially synced';
}