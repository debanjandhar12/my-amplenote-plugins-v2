import {mockApp} from "../../../../common-utils/amplenote-mocks.js";
import {EmbeddingGeneratorFactory} from "../../../CopilotDB/embeddings/EmbeddingGeneratorFactory.js";
import {VercelAIGatewayEmbeddingGenerator} from "../../../CopilotDB/embeddings/VercelAIGatewayEmbeddingGenerator.js";
import {OpenAIEmbeddingGenerator} from "../../../CopilotDB/embeddings/OpenAIEmbeddingGenerator.js";
import {EMBEDDING_API_URL_SETTING} from "../../../constants.js";
import { allure } from 'jest-allure2-reporter/api';


describe('EmbeddingGeneratorFactory', () => {
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    test('throws error for unsupported provider', async () => {
        const app = mockApp();
        app.settings[EMBEDDING_API_URL_SETTING] = 'https://unsupported-api.com/v1';
        await expect(async () => {
            await EmbeddingGeneratorFactory.create(app);
        }).rejects.toThrow('not supported');
    });
});
