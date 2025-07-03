import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import {DuckDBHelpCenterManager} from "./DuckDB/DuckDBHelpCenterManager.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";

export const searchHelpCenter = async (app, queryText, {limit = 15}) => {
    if (!queryText || !queryText.trim()) return [];

    DuckDBConnectionController.cancelTerminate();
    const helpCenterManager = new DuckDBHelpCenterManager();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, "query"))[0];
        const result = await helpCenterManager.searchHelpCenterRecordByEmbedding(queryVector, {limit});
        DuckDBConnectionController.scheduleTerminate();
        return result;
    } catch (e) {
        throw new Error(`Error querying vectors: ${e}`);
    }
}

