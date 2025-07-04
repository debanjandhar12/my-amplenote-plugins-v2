import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import {EMBEDDING_API_KEY_SETTING} from "../../constants.js";

export class PineconeEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('llama-text-embed-v2', 0, true, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        textArray = this.getProcessedTextArray(textArray, inputType, "", "");
        let embeddings = await this._fetchWithRetry(app, textArray, inputType)
        return embeddings.map(embedding => new Float32Array(embedding.values));
    }

    async _fetchWithRetry(app, textArray, inputType) {
        try {
            return await this._fetchEmbedding(app, textArray, inputType);
        } catch (e) {
            if (e.message?.includes('rate limit') || e.message?.includes('failed to reach Pinecone')) {
                console.warn('Pinecone embedding rate limit error detected. Waiting for 60 seconds...', e);
                await this._handleRateLimit();
                return await this._fetchEmbedding(app, textArray, inputType);
            }
            throw e;
        }
    }

    async _fetchEmbedding(app, textArray, inputType) {
        const res = await fetch("https://api.pinecone.io/embed", {
            "headers": {
                "accept": "*/*",
                "api-key": app.settings[EMBEDDING_API_KEY_SETTING],
                "content-type": "application/json",
                "x-pinecone-api-version": "2024-10"
            },
            "body": JSON.stringify({
                model: this.MODEL_NAME,
                inputs: textArray.map(input => ({text: input})),
                parameters: {
                    input_type: inputType.toLowerCase(),
                    truncate: 'END'
                }
            }),
            "method": "POST",
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text);
        }
        const json = await res.json();
        return json.data;
    }

    async _handleRateLimit() {
        const RATE_LIMIT_DURATION_MS = 60000;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DURATION_MS));
    }
}
