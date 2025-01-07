import {PINECONE_API_KEY_SETTING} from "../../constants.js";

export function getEmbeddingProvider(app) {
    if (app.settings[PINECONE_API_KEY_SETTING] && app.settings[PINECONE_API_KEY_SETTING].trim() !== '') {
        return "pinecone";
    }
    return "local";
}