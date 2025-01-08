import {PINECONE_API_KEY_SETTING} from "../../constants.js";

let adapter;
export async function getEmbeddingConfig(app) {
    if (app && app.settings &&
        app.settings[PINECONE_API_KEY_SETTING] && app.settings[PINECONE_API_KEY_SETTING].trim() !== '') {
        return {
            provider: "pinecone",
            apiKey: app.settings[PINECONE_API_KEY_SETTING],
            model: "multilingual-e5-large",
            maxConcurrency: 32
        }
    }

    // Use local models using huggingface transformers
    try {
        if (!adapter && navigator.gpu)
            adapter = await navigator.gpu.requestAdapter();
    } catch (e) {}
    const webGpuAvailable = adapter !== false && adapter !== null;
    return {
        provider: "local",
        model: "xenova/bge-small-en-v1.5",
        maxConcurrency: Math.max(navigator.hardwareConcurrency - 1, 1),
        webGpuAvailable
    }
}