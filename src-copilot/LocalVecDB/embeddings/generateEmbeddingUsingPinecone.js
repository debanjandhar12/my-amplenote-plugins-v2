import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {PINECONE_API_KEY_SETTING} from "../../constants.js";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";

export async function generateEmbeddingUsingPinecone(app, textArray, inputType) {
    if (!window.pineconeClient) {
        const {Pinecone} = await dynamicImportESM("@LocalVecDB-database/LocalVecDB");
        window.pineconeClient = new Pinecone({
            apiKey: app.settings[PINECONE_API_KEY_SETTING],
        });
    }

    const embeddingConfig = await getEmbeddingConfig(app);
    let embeddings = await attemptEmbedding(embeddingConfig, textArray, inputType);

    return embeddings.map(embedding => embedding.values);
}

async function attemptEmbedding(embeddingConfig, textArray, inputType) {
    try {
        const result = await pineconeClient.inference.embed(
            embeddingConfig.model,
            textArray,
            {inputType, truncate: 'END'}
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        return result;
    } catch (e) {
        if (e.message?.includes('rate limit') || e.message?.includes('failed to reach Pinecone')) {
            console.warn('Pinecone embedding rate limit error detected. Waiting for 60 seconds...', e);
            await handleRateLimit();
            const result = await pineconeClient.inference.embed(
                embeddingConfig.model,
                textArray,
                {inputType, truncate: 'END'}
            );
            return result;
        }
        throw e;
    }
}

async function handleRateLimit() {
    const RATE_LIMIT_DURATION_MS = 60000;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DURATION_MS));
}