import {IndexedDBManager} from "./IndexedDBManager.js";
import {getSyncState} from "./getSyncState.js";
import {getCosineSimilarity} from "./utils/getCosineSimilarity.js";
import {getDotProduct} from "./utils/getDotProduct.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";

// Based on: https://github.com/babycommando/entity-db/blob/main/src/index.js
export const searchNotes = async (app, queryText, queryTextType, {limit = 256,
    isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null}) => {
    if (await getSyncState(app) === 'Not synced')
        throw new Error('No syncing has been performed, or the last sync is outdated. Please sync your notes with LocalVecDB.');

    if (!queryText || !queryText.trim()) return [];

    const indexedDBManager = new IndexedDBManager();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, queryTextType || "query"))[0];
        const allEmbeddings = await indexedDBManager.getAllNotesEmbeddings();
        const filteredEmbeddings = allEmbeddings.filter(entry => {
            if (isArchived !== null && !entry.metadata.isArchived === isArchived) return false;
            if (isSharedByMe !== null && !entry.metadata.isSharedByMe === isSharedByMe) return false;
            if (isSharedWithMe !== null && !entry.metadata.isSharedWithMe === isSharedWithMe) return false;
            if (isTaskListNote !== null && !entry.metadata.isTaskListNote === isTaskListNote) return false;
            return true;
        });

        // Calculate cosine similarity for each vector and sort by similarity
        const similarities = filteredEmbeddings.map((entry) => {
            const score = embeddingGenerator.IS_GENERATED_EMBEDDING_NORMALIZED ? getDotProduct(queryVector, entry.values) : getCosineSimilarity(queryVector, entry.values);
            return { ...entry, score };
        });

        similarities.sort((a, b) => b.score - a.score); // Sort by similarity (descending)

        await indexedDBManager.closeDB();
        return similarities.slice(0, limit); // Return the top N results based on limit
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}
