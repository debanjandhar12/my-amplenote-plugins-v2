import {IndexedDBManager} from "./IndexedDBManager.js";
import {getCosineSimilarity} from "./utils/getCosineSimilarity.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";

export const searchHelpCenter = async (app, queryText, {limit = 256}) => {
    if (!queryText || !queryText.trim()) return [];

    const indexedDBManager = new IndexedDBManager();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, "query"))[0];
        const allEmbeddings = await indexedDBManager.getAllHelpCenterEmbeddings();

        // Calculate cosine similarity for each vector and sort by similarity
        const similarities = allEmbeddings.map((entry) => {
            const score = getCosineSimilarity(queryVector, entry.values);
            return { ...entry, score };
        });

        similarities.sort((a, b) => b.score - a.score); // Sort by similarity (descending)

        await indexedDBManager.closeDB();
        return similarities.slice(0, limit); // Return the top N results based on limit
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}

