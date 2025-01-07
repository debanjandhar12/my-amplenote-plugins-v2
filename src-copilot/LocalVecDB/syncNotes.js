import {IndexedDBManager} from "./IndexedDBManager.js";
import {Splitter} from "./Splitter.js";
import {LOCAL_VEC_DB_MAX_TOKENS} from "../constants.js";
import {getEmbeddingFromText} from "./embeddings/EmbeddingManager.js";
import {chunk} from "lodash-es";
import {getEmbeddingProvider} from "./embeddings/getEmbeddingProvider.js";

export const syncNotes = async (app) => {
    const performanceStartTime = performance.now();
    const indexedDBManager = new IndexedDBManager();
    let lastSyncTime = await indexedDBManager.getConfigValue('lastSyncTime')
        || new Date(0).toISOString();
    const lastPluginUUID = await indexedDBManager.getConfigValue('lastPluginUUID');
    const lastEmbeddingProvider = await indexedDBManager.getConfigValue('lastEmbeddingProvider');

    // -- Reset DB if plugin UUID / embedding provider has changed --
    if (lastPluginUUID && lastPluginUUID !== app.context.pluginUUID) {
        await indexedDBManager.resetDB();
        lastSyncTime = new Date(0).toISOString();
    }
    if (lastEmbeddingProvider && lastEmbeddingProvider !== getEmbeddingProvider(app)) {
        await indexedDBManager.resetDB();
        lastSyncTime = new Date(0).toISOString();
    }

    // -- Fetch target notes from amplenote --
    const allNotes = await app.filterNotes({});
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
    })
    // Sort by updatedAt ascending
    .sort((a, b) => {
        try {
            const aParsedUpdatedAt = new Date(a.updated || a.updatedAt);
            const bParsedUpdatedAt = new Date(b.updated || b.updatedAt);
            return aParsedUpdatedAt - bParsedUpdatedAt;
        } catch (e) {
            return -1;
        }
    });

    // -- Split notes which are updated or created and add to records --
    const records = [];
    for (const note of targetNotes) {
        const splitter = new Splitter(LOCAL_VEC_DB_MAX_TOKENS);
        const splitResultForNote = await splitter.split(app, note);
        records.push(...splitResultForNote);
    }

    // -- Delete existing records with target noteUUIDs --
    await indexedDBManager.deleteNoteEmbeddingByNoteUUIDList(records.map(record => record.noteUUID));

    // -- Create embeddings for split records and add to database --
    // Chunk the records into smaller chunks (required for pinecone embedding interference)
    const chunkSize = getEmbeddingProvider(app) === 'local' ? Math.max(navigator.hardwareConcurrency - 1, 1) : 32;
    const recordsChunks = chunk(records, chunkSize);
    for (const recordChunk of recordsChunks) {
        // 1. Generate embeddings and add to records
        (await getEmbeddingFromText(app,
                recordChunk.map(record => record.metadata.pageContent))).forEach((embedding, index) => {
            recordChunk[index].values = embedding;
        });
        // 2. Add noteUUID to records
        recordChunk.forEach(record => record.noteUUID = record.metadata.noteUUID);
        // 3. Insert / update records
        await indexedDBManager.putMultipleNoteEmbedding(recordChunk);
        // 4. Update configs so that partial failures can be resumed
        try {
            const note = targetNotes[targetNotes.findIndex(n => n.uuid === recordChunk[recordChunk.length-1].metadata.noteUUID)];
            const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
            parsedUpdatedAt.setMinutes(parsedUpdatedAt.getMinutes() - 1);
            await indexedDBManager.setConfigValue('lastSyncTime', parsedUpdatedAt.toISOString());
        } catch (e) {}
        await indexedDBManager.setConfigValue('lastPluginUUID', app.context.pluginUUID);
        await indexedDBManager.setConfigValue('lastEmbeddingProvider', getEmbeddingProvider(app));
    }

    await indexedDBManager.setConfigValue('lastSyncTime', new Date().toISOString());
    await indexedDBManager.setConfigValue('lastPluginUUID', app.context.pluginUUID);
    await indexedDBManager.setConfigValue('lastEmbeddingProvider', getEmbeddingProvider(app));
    console.log('syncNotes perf:', performance.now() - performanceStartTime, ', note count:', records.length);
    return true;
}

