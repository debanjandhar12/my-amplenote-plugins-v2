import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_KEY_SETTING} from "../../constants.js";

let createFireworks, embedMany;
export class FireworksEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('nomic-ai/nomic-embed-text-v1.5', 0.008, 64);
    }

    async generateEmbedding(app, textArray, inputType) {
        if (!createFireworks) {
            createFireworks = (await dynamicImportESM("@ai-sdk/fireworks")).createFireworks;
        }
        if (!embedMany) {
            embedMany = (await dynamicImportESM("ai")).embedMany;
        }
        textArray = this.getProcessedTextArray(textArray, inputType,
            "search_query: ", "search_query: ");
        const { embeddings } = await embedMany({
            model: createFireworks({
                apiKey: app.settings[EMBEDDING_API_KEY_SETTING]
            }).textEmbeddingModel(this.MODEL_NAME),
            values: textArray,
        });
        return embeddings;
    }
}