import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../constants.js";

export async function getLLMModel(appSettings) {
    let apiUrl = appSettings[LLM_API_URL_SETTING];
    let model = appSettings[LLM_MODEL_SETTING];
    const apiKey = appSettings[LLM_API_KEY_SETTING];
    if (!apiUrl || !apiUrl.trim()) throw new Error('API URL is not provided. Please check plugin settings.');
    if (!model || !model.trim()) throw new Error('Model is not provided. Please check plugin settings.');
    
    if (apiUrl.endsWith('/chat/completion')) {
        apiUrl = apiUrl.slice(0, -16); // Remove '/chat/completion' (16 characters)
    }
    
    apiUrl = apiUrl.toLowerCase();
    model = model.toLowerCase();

    if (apiUrl.includes('groq')) {
        const {createGroq} = await dynamicImportESM("@ai-sdk/groq");
        return createGroq({
            apiKey: apiKey,
            baseURL: apiUrl // Default: https://api.groq.com/openai/v1
        }).languageModel(model);
    }
    else if (apiUrl.includes('localhost')) {
        const {createOllama} = await dynamicImportESM("ollama-ai-provider");
        return createOllama({
            apiKey: apiKey,
            baseURL: apiUrl // Default: http://localhost:11434/api
        }).languageModel(model);
    }
    else if (apiUrl.includes('googleapis')) {
        const {createGoogleGenerativeAI} = await dynamicImportESM("@ai-sdk/google");
        return createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: apiUrl // Default: https://generativelanguage.googleapis.com/v1beta
        }).languageModel(model);
    }
    else if (apiUrl.includes('anthropic')) {
        const {createAnthropic} = await dynamicImportESM("@ai-sdk/anthropic");
        return createAnthropic({
            apiKey: apiKey,
            baseURL: apiUrl,
            headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
        }).languageModel(model);
    }
    else if (apiUrl.includes('openai') || apiUrl.includes('openrouter')) {
        const {createOpenAI} = await dynamicImportESM("@ai-sdk/openai");
        return createOpenAI({
            apiKey: apiKey,
            baseURL: apiUrl    // Default: https://api.openai.com/v1
        }).languageModel(model); // {parallelToolCalls: false} causing issues with generateText
    }
    else if (apiUrl.includes('fireworks')) {
        const {createFireworks} = await dynamicImportESM("@ai-sdk/fireworks");
        return createFireworks({
            apiKey: apiKey,
            baseURL: apiUrl
        }).languageModel(model.startsWith('accounts/fireworks/models/') ? model : `accounts/fireworks/models/${model}`);
    }
    else throw new Error('It is likely that incorrect LLM API URL is provided. Please check plugin settings.');
}