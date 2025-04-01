import {getEmbeddingProviderName} from "./getEmbeddingProviderName.js";
import {OpenAIEmbeddingGenerator} from "./OpenAIEmbeddingGenerator.js";
import {LocalEmbeddingGenerator} from "./LocalEmbeddingGenerator.js";
import {FireworksEmbeddingGenerator} from "./FireworksEmbeddingGenerator.js";
import {OllamaEmbeddingGenerator} from "./OllamaEmbeddingGenerator.js";
import {PineconeEmbeddingGenerator} from "./PineconeEmbeddingGenerator.js";
import {GoogleEmbeddingGenerator} from "./GoogleEmbeddingGenerator.js";

export class EmbeddingGeneratorFactory {
    static async create(app) {
        const embeddingProviderName = getEmbeddingProviderName(app);
        switch (embeddingProviderName) {
            case 'openai':
                return new OpenAIEmbeddingGenerator();
            case 'fireworks':
                return new FireworksEmbeddingGenerator();
            case 'ollama':
                return new OllamaEmbeddingGenerator();
            case 'pinecone':
                return new PineconeEmbeddingGenerator();
            case 'google':
                return new GoogleEmbeddingGenerator();
            case 'local':
                return new LocalEmbeddingGenerator();
        }
        throw new Error(`Embedding provider ${embeddingProviderName} not supported.`);
    }
}
