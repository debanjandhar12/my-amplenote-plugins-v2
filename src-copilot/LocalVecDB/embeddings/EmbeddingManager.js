import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {PINECONE_API_KEY_SETTING} from "../../constants.js";
import {getEmbeddingProvider} from "./getEmbeddingProvider.js";
import {localEmbeddingWorker} from "./LocalEmbedding.worker.js";

export async function getEmbeddingFromText(app, textArray, inputType = 'passage') {
    if (typeof textArray === 'string') textArray = [textArray];
    let embeddings;
    if (getEmbeddingProvider(app) === 'pinecone') {
        embeddings = await generateEmbeddingUsingPineconeProvider(app, textArray, inputType);
    } else {
        embeddings = await Promise.all(textArray.map(text => generateEmbeddingUsingLocalProvider(text, inputType)));
    }
    return embeddings;
}

async function generateEmbeddingUsingLocalProvider(text, inputType) {
    const inputText = inputType === 'query' ? "Represent this sentence for searching relevant passages: " + text
        : text;
    return await localEmbeddingWorker.send({inputText});
}

async function generateEmbeddingUsingPineconeProvider(app, textArray, inputType) {
    if (!window.pineconeClient) {
        const { Pinecone } = await dynamicImportESM("@pinecone-database/pinecone");
        window.pineconeClient = new Pinecone({
            apiKey: app.settings[PINECONE_API_KEY_SETTING],
        });
    }
    const embeddings = await pineconeClient.inference.embed(
        'multilingual-e5-large',
        textArray,
        {inputType, truncate: 'END'}
    );
    if (textArray.length >= 16) {    // Don't wait for small requests
        // Wait for few seconds to avoid rate limit of 250k tokens / min
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return embeddings.map(embedding => embedding.values);
}