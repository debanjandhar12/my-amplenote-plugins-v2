import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_KEY_SETTING} from "../../constants.js";

let createGoogleGenerativeAI, embedMany;
export class GoogleEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('text-embedding-004', 0, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        if (!createGoogleGenerativeAI) {
            createGoogleGenerativeAI = (await dynamicImportESM("@ai-sdk/google")).createGoogleGenerativeAI;
        }
        if (!embedMany) {
            embedMany = (await dynamicImportESM("ai")).embedMany;
        }
        textArray = this.getProcessedTextArray(textArray, inputType,
            "", "");
        const { embeddings } = await embedMany({
            model: createGoogleGenerativeAI({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING]
            }).textEmbeddingModel(this.MODEL_NAME, {
                taskType: inputType.toLowerCase() === "query" ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
            }),
            values: textArray,
        });
        return embeddings;
    }
}