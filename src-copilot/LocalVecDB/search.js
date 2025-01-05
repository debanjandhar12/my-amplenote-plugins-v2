import {IndexedDBManager} from "./IndexedDBManager.js";
import {getEmbeddingFromText} from "./EmbedingManager.js";

// Based on: https://github.com/babycommando/entity-db/blob/main/src/index.js
export const search = async (app, queryText, limit = 32) => {
    if (!queryText || !queryText.trim()) return [];
    try {
        // Get embeddings for the query text
        const indexedDBManager = new IndexedDBManager();
        const allEmbeddings = await indexedDBManager.getAllNotesEmbeddings();
        const queryVector = (await getEmbeddingFromText(app, queryText, "query"))[0];

        // Calculate cosine similarity for each vector and sort by similarity
        const similarities = allEmbeddings.map((entry) => {
            const score = cosineSimilarity(queryVector, entry.values);
            return { ...entry, score };
        });

        similarities.sort((a, b) => b.score - a.score); // Sort by similarity (descending)
        return similarities.slice(0, limit); // Return the top N results based on limit
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}

const cosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error("Cannot calculated cosine similarity as vector are of different size");
    }
    const dotProduct = vecA.reduce((sum, val, index) => sum + val * vecB[index],0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}