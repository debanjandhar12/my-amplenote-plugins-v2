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

    return allNotes.length === uniqueNoteUUIDsCount ? 'Fully Synced' : 'Partially synced';
}