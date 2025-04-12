import {mockApp} from "../../../../common-utils/test-helpers.js";
import {GoogleEmbeddingGenerator} from "../../../LocalVecDB/embeddings/GoogleEmbeddingGenerator.js";
import {EMBEDDING_API_KEY_SETTING} from "../../../constants.js";

describe('Google Embedding', () => {
    test('works with single string', async () => {
        if (!process.env.GOOGLE_API_KEY) return;
        const embeddingGenerator = new GoogleEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.GOOGLE_API_KEY;
        const result = await embeddingGenerator.generateEmbedding(app, "Hi", 'query');
        expect(result.length).toBe(1);
        expect(Array.isArray(result)).toBe(true);
        expect(Array.isArray(result[0])).toBe(true);
    });

    test('works with array', async () => {
        if (!process.env.GOOGLE_API_KEY) return;
        const embeddingGenerator = new GoogleEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.GOOGLE_API_KEY;
        const result = await embeddingGenerator.generateEmbedding(app, ["Hello", "World"], 'query');
        expect(result.length).toBe(2);
        expect(Array.isArray(result)).toBe(true);
        expect(Array.isArray(result[0])).toBe(true);
        expect(Array.isArray(result[1])).toBe(true);
    });

    test('throws error with invalid API key', async () => {
        const embeddingGenerator = new GoogleEmbeddingGenerator();
        const app = mockApp();
        app.settings[EMBEDDING_API_KEY_SETTING] = "invalid_api_key";

        await expect(async () => {
            await embeddingGenerator.generateEmbedding(app, "Hi", 'query');
        }).rejects.toThrow();
    });
});