import {getEmbeddingConfig} from "./getEmbeddingConfig.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

export async function generateEmbeddingUsingOllama(app, textArray, inputType) {
    const textArrayMod = inputType === 'query' ? textArray.map(text => "Represent this sentence for searching relevant passages: " + text)
        : textArray;

    const embeddingConfig = await getEmbeddingConfig(app);
    if (!embeddingConfig.model.includes('snowflake-arctic-embed')) {
        throw new Error('Unexpected embedding model');
    }

    const {createOllama} = await dynamicImportESM("ollama-ai-provider");

    const embeddingModel = createOllama({
        basePath: 'http://localhost:11434/api',
    }).embedding('snowflake-arctic-embed:33m-s-fp16', {truncate: true});

    let embeddings = [];
    for (let i = 0; i < textArrayMod.length; i++) {
        try {
            embeddings.push((await embeddingModel.doEmbed({
                values: [textArrayMod[i]]
            })).embeddings);
        } catch (e) {
            textArrayMod[i] = textArrayMod[i].substring(0, 512*2);
            embeddings.push((await embeddingModel.doEmbed({
                values: [textArrayMod[i]]
            })).embeddings);
        }
    }
    return embeddings;
}