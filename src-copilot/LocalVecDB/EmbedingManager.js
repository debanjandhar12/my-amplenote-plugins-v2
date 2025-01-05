import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {PINECONE_API_KEY_SETTING} from "../constants.js";

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

export function getEmbeddingProvider(app) {
    if (app.settings[PINECONE_API_KEY_SETTING] && app.settings[PINECONE_API_KEY_SETTING].trim() !== '') {
        return "pinecone";
    }
    return "local";
}

async function generateEmbeddingUsingLocalProvider(text, inputType) {
    if (!window.Mutex) {
        window.Mutex = new (await dynamicImportESM("async-mutex")).Mutex();
    }
    const release = await window.Mutex.acquire();
    if (!window.pipeline) {
        window.pipeline = (await dynamicImportESM("@huggingface/transformers")).pipeline;
    }
    if (!window.embeddingPipe) {
        window.embeddingPipe = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
            dtype: 'q8',
            device: 'wasm'
        });
        // Try with GPU
        try {
            if (navigator.gpu) {
                let embeddingPipeWithGPU = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
                    dtype: 'q8',
                    device: 'webgpu'
                });
                const testResult = await embeddingPipeWithGPU("Test", {});
                if (!testResult.data) throw new Error('GPU test failed');
                window.embeddingPipe = embeddingPipeWithGPU;
                console.log('Using GPU for embedding 🎉');
            }
        } catch (e) {}
    }
    const inputText = inputType === 'query' ? "Represent this sentence for searching relevant passages: " + text
        : text;
    const output = await window.embeddingPipe(inputText, {
        pooling: 'mean',
        normalize: true,
    });
    release();
    return Array.from(output.data);
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