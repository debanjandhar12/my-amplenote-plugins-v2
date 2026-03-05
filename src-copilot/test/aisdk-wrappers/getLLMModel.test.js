import {getLLMModel} from "../../aisdk-wrappers/getLLMModel.js";
import {LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../../constants.js";
import { allure } from 'jest-allure2-reporter/api';


describe('getLLMModel', () => {
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    test('throws error for unsupported API URL', async () => {
        const appSettings = {
            [LLM_API_URL_SETTING]: 'https://unsupported-api.com/v1',
            [LLM_MODEL_SETTING]: 'gpt-4',
            [LLM_API_KEY_SETTING]: 'test-api-key'
        };

        await expect(async () => {
            await getLLMModel(appSettings);
        }).rejects.toThrow('incorrect LLM API URL');
    });
});
