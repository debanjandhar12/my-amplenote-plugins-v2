import {EMBEDDING_API_URL_SETTING} from "../../constants.js";

export function getEmbeddingProviderName(app) {
    if (!app) throw new Error('app object must be passed to this function');

    const embedApiUrl = app.settings[EMBEDDING_API_URL_SETTING] || "";
    if (embedApiUrl.includes('api.openai.com')) {
        return "openai";
    }
    else if (embedApiUrl.includes('googleapis')) {
        return "google";
    }
    else if (embedApiUrl.includes('localhost')) {
        return "ollama";
    }
    else if (embedApiUrl.includes('fireworks')) {
        return "fireworks";
    }
    else if (embedApiUrl.includes('pinecone')) {
        return "pinecone";
    }
    else if (embedApiUrl.trim() === '' || embedApiUrl.trim() === 'local') {
        return "local";
    }
    else {
        throw new Error(`Embedding provider ${embedApiUrl} not supported. Please set correct API URL or keep it empty to use in-browser local embedding model.`);
    }
}
