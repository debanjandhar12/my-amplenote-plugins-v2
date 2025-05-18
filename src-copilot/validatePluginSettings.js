import {getLLMModel} from "./aisdk-wrappers/getLLMModel.js";
import {
    EMBEDDING_API_KEY_SETTING,
    EMBEDDING_API_URL_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING, LLM_MAX_TOKENS_SETTING, MCP_SERVER_URL_LIST_SETTING
} from "./constants.js";
import {EmbeddingGeneratorFactory} from "./LocalVecDB/embeddings/EmbeddingGeneratorFactory.js";

export async function validatePluginSettings(app) {
    const errors = [];
    const settings = app.settings;

    // LLM related validations
    if (!settings[LLM_API_URL_SETTING]) {
        errors.push('LLM API URL must be provided.');
    }
    let isLLMApiUrlValid = false;
    try {
        new URL(settings[LLM_API_URL_SETTING]);
        isLLMApiUrlValid = true;
    } catch (e) {
        errors.push('LLM API URL provided is not a valid URL.');
    }
    if (!settings[LLM_API_KEY_SETTING] && !settings[LLM_API_URL_SETTING].includes('localhost')) {
        errors.push('LLM API Key must be provided.');
    }
    if (!settings[LLM_API_URL_SETTING].trim()) {
        errors.push('LLM API URL cannot be empty.');
    }
    try {
        if (isLLMApiUrlValid) {
            await getLLMModel(app.settings);
        }
    } catch (e) {
        errors.push(e.message);
    }
    if (appSettings[LLM_MAX_TOKENS_SETTING] &&appSettings[LLM_MAX_TOKENS_SETTING].trim() !== '') {
        if (isNaN(appSettings[LLM_MAX_TOKENS_SETTING])) {
            errors.push('LLM Max Tokens must be a valid number.');
        }
        if (Number(appSettings[LLM_MAX_TOKENS_SETTING]) < 4096) {
            errors.push('LLM Max Tokens must be greater than or equal to 4096.');
        }
    }

    // Embeddings related validations
    if (settings[EMBEDDING_API_URL_SETTING].trim()) {
        let isEmbeddingUrlValid = false;
       try {
           new URL(settings[EMBEDDING_API_URL_SETTING]);
           isEmbeddingUrlValid = true;
       } catch (e) {
           errors.push('Embedding API URL provided is not a valid URL.');
       }
        if (!settings[EMBEDDING_API_KEY_SETTING] && !settings[EMBEDDING_API_URL_SETTING].includes('localhost')) {
           errors.push('Embedding API Key must be provided when Embedding API URL is provided.');
       }
       try {
            if (isEmbeddingUrlValid) {
                await EmbeddingGeneratorFactory.create(app);
            }
       } catch (e) {
           errors.push(e.message);
       }
    }
    if (settings[EMBEDDING_API_KEY_SETTING].trim() && !settings[EMBEDDING_API_URL_SETTING].trim()) {
        errors.push('Embedding API URL cannot be empty when Embedding API Key is provided.');
    }

    // MCP Server List related validations
    if (settings[MCP_SERVER_URL_LIST_SETTING].trim()) {
        const urls = settings[MCP_SERVER_URL_LIST_SETTING].split(',');
        for (let url of urls) {
            if (url.trim() === '') continue;
            try {
                new URL(url);
            } catch (e) {
                errors.push(`MCP Server URL provided is not a valid URL: ${url}`);
            }
        }
    }

    return errors;
}