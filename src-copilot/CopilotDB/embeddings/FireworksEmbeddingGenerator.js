import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_KEY_SETTING, EMBEDDING_API_URL_SETTING} from "../../constants.js";
import {embedManyWithRateLimitAvoidanceRetry} from "../../aisdk-wrappers/embedManyWithRateLimitAvoidanceRetry.js";

const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1';

let createOpenAI;
export class FireworksEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('nomic-ai/nomic-embed-text-v1.5', 0.008, false, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        if (!createOpenAI) {
            createOpenAI = (await dynamicImportESM("@ai-sdk/openai")).createOpenAI;
        }
        textArray = this.getProcessedTextArray(textArray, inputType,
            "search_query: ", "search_query: ");
        const { embeddings } = await embedManyWithRateLimitAvoidanceRetry({
            model: createOpenAI({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING],
                baseURL: FIREWORKS_API_URL
            }).textEmbeddingModel(this.MODEL_NAME),
            values: textArray,
        });
        return embeddings.map(embedding => new Float32Array(embedding));
    }
}