import {IndexedDBManager} from "./IndexedDBManager.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";

export const getSyncState = async (app, syncNotesPromise = null) => {
    if  (syncNotesPromise) {
        return 'Syncing';
    }

    const indexedDBManager = new IndexedDBManager();
    const lastPluginUUID = await indexedDBManager.getConfigValue('lastPluginUUID');
    const lastEmbeddingModel = await indexedDBManager.getConfigValue('lastEmbeddingModel');
    const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
    if (lastPluginUUID !== app.context.pluginUUID || lastEmbeddingModel !== embeddingGenerator.MODEL_NAME) {
        await indexedDBManager.closeDB();
        return 'Not synced';
    }

    const uniqueNoteUUIDs = await indexedDBManager.getUniqueNoteUUIDsInNoteEmbeddings();
    const uniqueNoteUUIDsCount = uniqueNoteUUIDs.size;
    if (uniqueNoteUUIDsCount === 0) {
        await indexedDBManager.closeDB();
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
    await indexedDBManager.closeDB();
    if (targetNotes.length >= (allNotes.length/4)) {
        return 'Not synced';
    }

    return targetNotes.length === 0 ? 'Fully Synced' : 'Partially synced';
}
