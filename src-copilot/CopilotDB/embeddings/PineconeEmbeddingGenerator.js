import { EmbeddingGeneratorBase } from "./EmbeddingGeneratorBase.js";
import { EMBEDDING_API_KEY_SETTING } from "../../constants.js";
import { embedManyWithRateLimitAvoidanceRetry } from "../../aisdk-wrappers/embedManyWithRateLimitAvoidanceRetry.js";
import { createPineconeEmbeddingModal } from "../../aisdk-wrappers/createPineconeEmbeddingModal.js";

export class PineconeEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('llama-text-embed-v2', 0, true, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        textArray = this.getProcessedTextArray(textArray, inputType, "", "");
        const { embeddings } = await embedManyWithRateLimitAvoidanceRetry({
            model: createPineconeEmbeddingModal({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING]
            }).embedding(this.MODEL_NAME, { inputType }),
            values: textArray,
        });
        return embeddings.map(embedding => new Float32Array(embedding));
    }
}
