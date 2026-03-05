import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_KEY_SETTING} from "../../constants.js";
import {embedManyWithRateLimitAvoidanceRetry} from "../../aisdk-wrappers/embedManyWithRateLimitAvoidanceRetry.js";

const VERCEL_AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1';

let createOpenAI;
export class VercelAIGatewayEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('text-embedding-3-small', 0.02, true, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        if (!createOpenAI) {
            createOpenAI = (await dynamicImportESM("@ai-sdk/openai")).createOpenAI;
        }
        textArray = this.getProcessedTextArray(textArray, inputType,
            "", "");
        const { embeddings } = await embedManyWithRateLimitAvoidanceRetry({
            model: createOpenAI({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING],
                baseURL: VERCEL_AI_GATEWAY_URL
            }).embedding(this.MODEL_NAME),
            values: textArray,
        });
        return embeddings.map(embedding => new Float32Array(embedding));
    }
}
