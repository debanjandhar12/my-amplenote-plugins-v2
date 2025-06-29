import {IndexedDBManager} from "./IndexedDBManager.js";
import {getSyncState} from "./getSyncState.js";
import {getCosineSimilarity} from "./utils/getCosineSimilarity.js";
import {getDotProduct} from "./utils/getDotProduct.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import { DuckDBManager } from "./DuckDB/DuckDBManager.js";

// Based on: https://github.com/babycommando/entity-db/blob/main/src/index.js
export const searchNotes = async (app, queryText, queryTextType, {limit = 256,
    isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null}) => {
    if (await getSyncState(app) === 'Not synced')
        throw new Error('No syncing has been performed, or the last sync is outdated. Please sync your notes with LocalVecDB.');

    if (!queryText || !queryText.trim()) return [];

    const dbm = new DuckDBManager();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, queryTextType || "query"))[0];
        return await dbm.searchNoteRecordByEmbedding(queryVector, {
            limit,
            isArchived,
            isSharedByMe,
            isSharedWithMe,
            isTaskListNote
        });
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}
