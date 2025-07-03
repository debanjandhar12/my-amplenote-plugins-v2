import {IndexedDBManager} from "./IndexedDBManager.js";
import {getCosineSimilarity} from "./utils/getCosineSimilarity.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import {DuckDBManager} from "./DuckDB/DuckDBManager.js";
import DuckDBWorkerManager from "./DuckDB/DuckDBWorkerManager.js";

export const searchHelpCenter = async (app, queryText, {limit = 256}) => {
    if (!queryText || !queryText.trim()) return [];

    DuckDBWorkerManager.cancelTerminate();
    const dbm = new DuckDBManager();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, "query"))[0];
        const result = dbm.wtf(queryVector);
        DuckDBWorkerManager.scheduleTerminate();
        return result;
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}

