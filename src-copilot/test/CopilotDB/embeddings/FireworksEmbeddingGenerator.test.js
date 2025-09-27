import {mockApp} from "../../../../common-utils/amplenote-mocks.js";
import {FireworksEmbeddingGenerator} from "../../../CopilotDB/embeddings/FireworksEmbeddingGenerator.js";
import {EMBEDDING_API_KEY_SETTING} from "../../../constants.js";
import { allure } from 'jest-allure2-reporter/api';

describe('Fireworks Embedding', () => {
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    test.skipIf(!process.env.FIREWORKS_API_KEY, 'works with single string', async () => {
        const embeddingGenerator = new FireworksEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.FIREWORKS_API_KEY;
        const result = await embeddingGenerator.generateEmbedding(app, "Hi", 'query');
        expect(result.length).toBe(1);
        expect(Array.isArray(result)).toBe(true);
        expect(result[0] instanceof Float32Array).toBe(true);
    });

    test.skipIf(!process.env.FIREWORKS_API_KEY, 'works with array', async () => {
        const embeddingGenerator = new FireworksEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.FIREWORKS_API_KEY;
        const result = await embeddingGenerator.generateEmbedding(app, ["Hello", "World"], 'query');
        expect(result.length).toBe(2);
        expect(Array.isArray(result)).toBe(true);
        expect(result[0] instanceof Float32Array).toBe(true);
        expect(result[1] instanceof Float32Array).toBe(true);
    });

    test('throws error with invalid API key', async () => {
        const embeddingGenerator = new FireworksEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = "invalid_api_key";

        await expect(async () => {
            await embeddingGenerator.generateEmbedding(app, "Hi", 'query');
        }).rejects.toThrow();
    });
});
