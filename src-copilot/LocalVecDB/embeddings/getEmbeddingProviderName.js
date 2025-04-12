import {EMBEDDING_API_KEY_SETTING, EMBEDDING_API_URL_SETTING, PINECONE_API_KEY_SETTING} from "../../constants.js";

export function getEmbeddingProviderName(app) {
    if (!app) throw new Error('app object must be passed to this function');

    // Upgrade old settings to new settings
    try {
        if (app.settings[PINECONE_API_KEY_SETTING] &&
            app.settings[PINECONE_API_KEY_SETTING].trim() !== '') {
            app.setSetting(EMBEDDING_API_URL_SETTING, 'https://api.pinecone.io/embed');
            app.settings[EMBEDDING_API_URL_SETTING] = "https://api.pinecone.io/embed";
            app.setSetting(EMBEDDING_API_KEY_SETTING, app.settings[PINECONE_API_KEY_SETTING]);
            app.settings[EMBEDDING_API_KEY_SETTING] = app.settings[PINECONE_API_KEY_SETTING];
            app.setSetting(PINECONE_API_KEY_SETTING, '');
        }
    } catch (e) {
        console.error(e);
    }

    // Return embedding provider name based on settings
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
