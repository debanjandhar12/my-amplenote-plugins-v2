import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_KEY_SETTING, LLM_API_KEY_SETTING} from "../../constants.js";

let createOpenAI, embedMany;
export class OpenAIEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('text-embedding-3-small', 0.02, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        if (!createOpenAI) {
            createOpenAI = (await dynamicImportESM("@ai-sdk/openai")).createOpenAI;
        }
        if (!embedMany) {
            embedMany = (await dynamicImportESM("ai")).embedMany;
        }
        textArray = this.getProcessedTextArray(textArray, inputType,
            "", "");
        const { embeddings } = await embedMany({
            model: createOpenAI({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING]
            }).embedding(this.MODEL_NAME),
            values: textArray,
        });
        return embeddings;
    }
}