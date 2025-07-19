import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import {DuckDBHelpCenterManager} from "./DuckDB/DuckDBHelpCenterManager.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";
import {getEmbeddingProviderName} from "./embeddings/getEmbeddingProviderName.js";

function calculateHelpCenterFilename(embeddingProviderName) {
    if (embeddingProviderName === 'local' || embeddingProviderName === 'ollama') {
        return 'localHelpCenterEmbeddings.parquet';
    }
    else if (embeddingProviderName === 'openai') {
        return 'openaiHelpCenterEmbeddings.parquet';
    }
    else if (embeddingProviderName === 'google') {
        return 'googleHelpCenterEmbeddings.parquet';
    }
    else if (embeddingProviderName === 'fireworks') {
        return 'fireworksHelpCenterEmbeddings.parquet';
    }
    else if (embeddingProviderName === 'pinecone') {
        return 'pineconeHelpCenterEmbeddings.parquet';
    }
    else throw new Error(`Embedding provider ${embeddingProviderName} not supported`);
}

export const searchHelpCenter = async (app, queryText, {limit = 15}) => {
    if (!queryText || !queryText.trim()) return [];

    await DuckDBConnectionController.lockAutoTerminate();
    const helpCenterManager = await DuckDBHelpCenterManager.getInstance();
    try {
        // Calculate filename based on embedding provider
        const embeddingProviderName = getEmbeddingProviderName(app);
        const filename = calculateHelpCenterFilename(embeddingProviderName);
        
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, "query"))[0];
        const result = await helpCenterManager.searchHelpCenterRecordByEmbedding(queryVector, {limit, filename});
        DuckDBConnectionController.unlockAutoTerminate();
        return result;
    } catch (e) {
        DuckDBConnectionController.unlockAutoTerminate();
        throw new Error(`Error querying vectors: ${e}`);
    }
}

