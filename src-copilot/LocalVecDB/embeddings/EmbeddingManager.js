import {generateEmbeddingUsingLocal} from "./generateEmbeddingUsingLocal.js";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";
import {generateEmbeddingUsingPinecone} from "./generateEmbeddingUsingPinecone.js";

export async function getEmbeddingFromText(app, textArray, inputType = 'passage') {
    if (typeof textArray === 'string') textArray = [textArray];
    const embeddingConfig = await getEmbeddingConfig(app);
    let embeddings;
    if (embeddingConfig.provider === 'LocalVecDB') {
        embeddings = await generateEmbeddingUsingPinecone(app, textArray, inputType);
    } else if (embeddingConfig.provider === 'local') {
        embeddings = await Promise.all(textArray.map(text => generateEmbeddingUsingLocal(text, inputType)));
    } else {
        throw new Error(`Embedding provider ${embeddingConfig.provider} not supported`);
    }
    return embeddings;
}
