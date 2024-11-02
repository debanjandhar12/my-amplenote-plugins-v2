import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../constants.js";

export async function getLLMModel(appSettings) {
    let apiUrl = appSettings[LLM_API_URL_SETTING];
    let model = appSettings[LLM_MODEL_SETTING];
    const apiKey = appSettings[LLM_API_KEY_SETTING];
    if (!apiUrl || !apiUrl.trim()) throw new Error('API URL is not provided. Please check plugin settings.');
    if (!model || !model.trim()) throw new Error('Model is not provided. Please check plugin settings.');
    apiUrl = apiUrl.toLowerCase();
    model = model.toLowerCase();

    if (apiUrl.includes('groq')) {
        const {createGroq} = await dynamicImportESM("@ai-sdk/groq");
        return createGroq({
            apiKey: apiKey,
            basePath: apiUrl
        }).languageModel(model);
    }
    else if (apiUrl.includes('localhost')) {
        const {createOllama} = await dynamicImportESM("ollama-ai-provider");
        return createOllama({
            apiKey: apiKey,
            basePath: apiUrl
        })
    } else if (apiUrl.includes('openai') || apiUrl.includes('fireworks')
        || apiUrl.includes('x.ai')) {
        const {createOpenAI} = await dynamicImportESM("@ai-sdk/openai");
        return createOpenAI({
            apiKey: apiKey,
            basePath: apiUrl
        }).languageModel(model);
    }
    else throw new Error('It is likely that incorrect LLM Settings are provided. Please check plugin settings.');
}