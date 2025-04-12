import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import {getEmbeddingProviderName} from "./getEmbeddingProviderName.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_URL_SETTING} from "../../constants.js";

export class OllamaEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('Snowflake/snowflake-arctic-embed-s', 0, 1);
    }

    async generateEmbedding(app, textArray, inputType) {
        const textArrayMod = this.getProcessedTextArray(textArray, inputType,
            "", "Represent this sentence for searching relevant passages: ");

        const {createOllama} = await dynamicImportESM("ollama-ai-provider");

        const embeddingModel = createOllama({
            basePath: app.settings[EMBEDDING_API_URL_SETTING],
        }).embedding('snowflake-arctic-embed:33m-s-fp16', {truncate: true});

        let embeddings = [];
        for (let i = 0; i < textArrayMod.length; i++) {
            const originalText = textArrayMod[i];
            for (let attempts = 1; true; attempts++) {
                try {
                    embeddings.push((await embeddingModel.doEmbed({
                        values: [textArrayMod[i]]
                    })).embeddings[0]);
                    break;
                } catch (e) {
                    if (attempts === 6) throw e;
                    if (attempts >= 3) {
                        console.log('Failed to embed text, retrying...', originalText);
                    }
                    const currentLength = textArrayMod[i].length;
                    textArrayMod[i] = textArrayMod[i].substring(0, Math.floor(currentLength * 0.75));
                }
            }
        }
        return embeddings;
    }
}