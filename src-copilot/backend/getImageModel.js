import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING} from "../constants.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export async function getImageModel(appSettings) {
    let apiUrl = appSettings[LLM_API_URL_SETTING];
    if (!apiUrl) throw new Error('LLM API URL is not provided. Please check and configure plugin settings.');
    const {createOpenAI} = await dynamicImportESM("@ai-sdk/openai");
    if (apiUrl.includes('api.openai.com')) {
        return createOpenAI({
            apiKey: appSettings[LLM_API_KEY_SETTING]
        }).image('dall-e-2');
    }
    return false;
}