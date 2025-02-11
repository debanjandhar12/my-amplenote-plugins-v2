import {getEmbeddingConfig} from "./getEmbeddingConfig.js";
import {PINECONE_API_KEY_SETTING} from "../../constants.js";

export async function generateEmbeddingUsingPinecone(app, textArray, inputType) {
    const embeddingConfig = await getEmbeddingConfig(app);
    let embeddings = await attemptEmbedding(app, embeddingConfig, textArray, inputType);

    return embeddings.map(embedding => embedding.values);
}

async function attemptEmbedding(app, embeddingConfig, textArray, inputType) {
    try {
        const result = await fetchPineconeEmbeddings(app, embeddingConfig.model, textArray, inputType);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return result;
    } catch (e) {
        if (e.message?.includes('rate limit') || e.message?.includes('failed to reach Pinecone')) {
            console.warn('Pinecone embedding rate limit error detected. Waiting for 60 seconds...', e);
            await handleRateLimit();
            return await fetchPineconeEmbeddings(app, embeddingConfig.model, textArray, inputType);
        }
        throw e;
    }
}

async function fetchPineconeEmbeddings(app, model, inputs, inputType) {
    const res = await fetch("https://api.pinecone.io/embed", {
        "headers": {
            "accept": "*/*",
            "api-key": app.settings[PINECONE_API_KEY_SETTING],
            "content-type": "application/json",
            "x-pinecone-api-version": "2024-10"
        },
        "body": JSON.stringify({
            model: model,
            inputs: inputs.map(input => ({text: input})),
            parameters: {
                input_type: inputType,
                truncate: 'END'
            }
        }),
        "method": "POST",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
    }
    const json = await res.json();
    return json.data;
}

async function handleRateLimit() {
    const RATE_LIMIT_DURATION_MS = 60000;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DURATION_MS));
}