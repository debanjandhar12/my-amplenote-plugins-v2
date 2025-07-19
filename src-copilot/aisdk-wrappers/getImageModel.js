import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING} from "../constants.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {createGoogleImageModel} from "./utils/GoogleImageModel.js";

export async function getImageModel(appSettings) {
    let apiUrl = appSettings[LLM_API_URL_SETTING];
    if (!apiUrl) throw new Error('LLM API URL is not provided. Please check and configure plugin settings.');
    
    // Remove /chat/completion suffix if it exists
    if (apiUrl.endsWith('/chat/completion')) {
        apiUrl = apiUrl.slice(0, -16); // Remove '/chat/completion' (16 characters)
    }
    if (apiUrl.includes('api.openai.com')) {
        const {createOpenAI} = await dynamicImportESM("@ai-sdk/openai");
        return createOpenAI({
            apiKey: appSettings[LLM_API_KEY_SETTING]
        }).image('dall-e-2', {maxImagesPerCall: 1});
    } else if (apiUrl.includes('googleapis')) {
        // Currently, not supported by ai sdk
        // const {createGoogleGenerativeAI} = await dynamicImportESM("@ai-sdk/google");
        // return createGoogleGenerativeAI({
        //     apiKey: appSettings[LLM_API_KEY_SETTING]
        // }).imageModel('imagen-3.0-generate-002', {maxImagesPerCall: 1});

        // Using custom implementation since Google AI SDK doesn't support image models natively
        return createGoogleImageModel(
            appSettings[LLM_API_KEY_SETTING], 
            'imagen-3.0-generate-002', 
            1
        );
    }
    else if (apiUrl.includes('fireworks')) {
        const {createFireworks} = await dynamicImportESM("@ai-sdk/fireworks");
        return createFireworks({
            apiKey: appSettings[LLM_API_KEY_SETTING]
        }).image('accounts/fireworks/models/flux-1-schnell-fp8');
    }
    return false;
}
