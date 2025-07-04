import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import {getEmbeddingProviderName} from "./getEmbeddingProviderName.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {EMBEDDING_API_URL_SETTING} from "../../constants.js";

export class OllamaEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('jina/jina-embeddings-v2-small-en', 0, true, 1);
    }

    async generateEmbedding(app, textArray, inputType) {
        const textArrayMod = this.getProcessedTextArray(textArray, inputType,
            "", "");

        const {createOllama} = await dynamicImportESM("ollama-ai-provider");

        const embeddingModel = createOllama({
            basePath: app.settings[EMBEDDING_API_URL_SETTING],
        }).embedding('jina/jina-embeddings-v2-small-en', {
            pooling: 'mean',
            normalize: true,
            truncate: true,
            max_length: LOCAL_VEC_DB_MAX_TOKENS // required for jina-embeddings-v2-small-en
        });

        // Ideally since we are passing truncate, we do not need to retry if
        // text is too long. However, due to a bug in the Ollama API,
        // instead of truncating, it throws error. This following code handles
        // the error by retrying with a shorter text.
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
        return embeddings.map(embedding => new Float32Array(embedding));
    }
}
