import { getEmbeddingConfig } from '../../../LocalVecDB/embeddings/getEmbeddingConfig.js';
import { PINECONE_API_KEY_SETTING } from '../../../constants.js';
import { mockApp } from '../../../../common-utils/test-helpers.js';

describe('getEmbeddingConfig', () => {
    test('provides cpu model when webgpu is not available and no pinecone key', async () => {
        window.gpuAdapter = undefined;
        const app = mockApp();
        app.settings = {
            [PINECONE_API_KEY_SETTING]: ''
        };
        const config = await getEmbeddingConfig(app, {
            hardwareConcurrency: 4,
            gpu: {
                requestAdapter: async () => null
            }
        });
        expect(config.provider).toBe('local');
        expect(config.model).toBe('Snowflake/snowflake-arctic-embed-s');
        expect(config.webGpuAvailable).toBe(false);
        expect(config.maxConcurrency).toBe(2); // hardwareConcurrency / 2
    });

    test('provides webgpu model when webgpu is available and no pinecone key', async () => {
        window.gpuAdapter = undefined;
        const app = mockApp();
        app.settings = {
            [PINECONE_API_KEY_SETTING]: ''
        };

        const config = await getEmbeddingConfig(app, {
            hardwareConcurrency: 4,
            gpu: {
                requestAdapter: async () => ({
                    type: 'mock-adapter',
                    features: {
                        has: () => true,
                    }
                })
            }
        });
        expect(config.provider).toBe('local');
        expect(config.model).toBe('Snowflake/snowflake-arctic-embed-s');
        expect(config.webGpuAvailable).toBe(true);
        expect(config.maxConcurrency).toBe(2); // hardwareConcurrency / 2
    });

    test('provides pinecone model when api key is available', async () => {
        const app = mockApp();
        app.settings = {
            [PINECONE_API_KEY_SETTING]: 'test-api-key'
        };

        const config = await getEmbeddingConfig(app);
        expect(config.provider).toBe('pinecone');
        expect(config.model).toBe('multilingual-e5-large');
        expect(config.apiKey).toBe('test-api-key');
        expect(config.maxConcurrency).toBe(64);
    });
});