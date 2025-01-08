import {IndexedDBManager} from "./IndexedDBManager.js";
import {Splitter} from "./Splitter.js";
import {LOCAL_VEC_DB_MAX_TOKENS} from "../constants.js";
import {getEmbeddingFromText} from "./embeddings/EmbeddingManager.js";
import {chunk} from "lodash-es";
import {getEmbeddingConfig} from "./embeddings/getEmbeddingConfig.js";

export const syncNotes = async (app, sendMessageToEmbed) => {
    const performanceStartTime = performance.now();
    const indexedDBManager = new IndexedDBManager();
    const embeddingConfig = await getEmbeddingConfig(app);
    let lastSyncTime = await indexedDBManager.getConfigValue('lastSyncTime')
        || new Date(0).toISOString();
    const lastPluginUUID = await indexedDBManager.getConfigValue('lastPluginUUID');
    const lastEmbeddingModel = await indexedDBManager.getConfigValue('lastEmbeddingModel');

    // -- Reset DB if plugin UUID / embedding model has changed --
    if (lastPluginUUID !== app.context.pluginUUID) {
        await indexedDBManager.resetDB();
        lastSyncTime = new Date(0).toISOString();
    }
    if (lastEmbeddingModel !== embeddingConfig.model) {
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
            if (aParsedUpdatedAt.toISOString() !== bParsedUpdatedAt.toISOString()) {
                return aParsedUpdatedAt - bParsedUpdatedAt;
            }
            return a.uuid.localeCompare(b.uuid);
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
    await indexedDBManager.deleteNoteEmbeddingByNoteUUIDList(records.map(record => record.metadata.noteUUID));

    // -- Create embeddings for split records and add to database --
    // Chunk the records into smaller chunks (required for pinecone embedding interference)
    const chunkSize = embeddingConfig.maxConcurrency;
    const recordsChunks = chunk(records, chunkSize);
    for (const recordChunk of recordsChunks) {
        // 1. Send progress to UI
        const currentChunkIndex = recordsChunks.findIndex(chunk => chunk === recordChunk);
        const remainingChunks = recordsChunks.slice(currentChunkIndex);
        const remainingNotes = new Set(
            remainingChunks.flatMap(chunk =>
                chunk.map(record => record.metadata.noteUUID)
            )
        ).size;
        const totalNotes = new Set(records.map(record => record.metadata.noteUUID)).size;
        sendMessageToEmbed(app, 'syncNotesProgress',
            `Using ${embeddingConfig.provider} embedding${embeddingConfig.provider==='local' ? 
                ` with ${embeddingConfig.webGpuAvailable ? 'gpu' : 'cpu'}`:''}: ${totalNotes-remainingNotes} / ${totalNotes}`);
        // 2. Generate embeddings and add to records
        const embeddings = await getEmbeddingFromText(app,
            recordChunk.map(record => record.metadata.pageContent));
        embeddings.forEach((embedding, index) => {
            recordChunk[index].values = embedding;
        });
        // 3. Insert / update records
        await indexedDBManager.putMultipleNoteEmbedding(recordChunk);
        // 4. Update configs so that partial failures can be resumed
        try {
            const note = targetNotes[targetNotes.findIndex(n => n.uuid === recordChunk[recordChunk.length-1].metadata.noteUUID)];
            const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
            parsedUpdatedAt.setSeconds(parsedUpdatedAt.getSeconds() - 1);
            await indexedDBManager.setConfigValue('lastSyncTime', parsedUpdatedAt.toISOString());
        } catch (e) {}
        await indexedDBManager.setConfigValue('lastPluginUUID', app.context.pluginUUID);
        await indexedDBManager.setConfigValue('lastEmbeddingModel', embeddingConfig.model);
    }

    await indexedDBManager.setConfigValue('lastSyncTime', new Date().toISOString());
    await indexedDBManager.setConfigValue('lastPluginUUID', app.context.pluginUUID);
    await indexedDBManager.setConfigValue('lastEmbeddingModel', embeddingConfig.model);
    console.log('syncNotes perf:', performance.now() - performanceStartTime, ', note count:', records.length);
    return true;
}

