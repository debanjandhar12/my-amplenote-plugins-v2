import {PINECONE_API_KEY_SETTING} from "../../constants.js";

export async function getEmbeddingConfig(app, navigator = window.navigator) {
    if (app && app.settings &&
        app.settings[PINECONE_API_KEY_SETTING] && app.settings[PINECONE_API_KEY_SETTING].trim() !== '') {
        return {
            provider: "pinecone",
            apiKey: app.settings[PINECONE_API_KEY_SETTING],
            model: "multilingual-e5-large",
            maxConcurrency: 64
        }
    }
    // -- Use local models using huggingface transformers --
    // When gpuAdapter is null or undefined, it means we didn't try to initialize it yet
    // When false, it means we tried to initialize it but failed.
    // When true, it means we successfully initialized it.
    try {
        if (window.gpuAdapter == null && navigator.gpu)
            window.gpuAdapter = await navigator.gpu.requestAdapter() || false;
    } catch (e) {}
    const webGpuAvailable = window.gpuAdapter !== false && window.gpuAdapter !== null && window.gpuAdapter !== undefined;
    return {
        provider: "local",
        model: "Snowflake/snowflake-arctic-embed-s",
        maxConcurrency: Math.max(navigator?.hardwareConcurrency - 2, 1),
        webGpuAvailable
    }
}