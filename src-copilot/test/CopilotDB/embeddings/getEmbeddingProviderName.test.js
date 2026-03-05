import {mockApp} from "../../../../common-utils/amplenote-mocks.js";
import {getEmbeddingProviderName} from "../../../CopilotDB/embeddings/getEmbeddingProviderName.js";
import {EMBEDDING_API_URL_SETTING} from "../../../constants.js";
import { allure } from 'jest-allure2-reporter/api';


describe('getEmbeddingProviderName', () => {
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    test('throws error for unsupported URL', () => {
        const app = mockApp();
        app.settings[EMBEDDING_API_URL_SETTING] = 'https://unsupported-api.com/v1';
        expect(() => {
            getEmbeddingProviderName(app);
        }).toThrow('not supported');
    });
});
