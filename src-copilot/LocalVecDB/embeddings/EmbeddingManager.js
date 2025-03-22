import {generateEmbeddingUsingLocal, initLocalEmbeddingWorker} from "./generateEmbeddingUsingLocal.js";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";
import {generateEmbeddingUsingPinecone} from "./generateEmbeddingUsingPinecone.js";
import 'scheduler-polyfill';

export async function getEmbeddingFromText(app, textArray, inputType = 'passage') {
    if (typeof textArray === 'string') textArray = [textArray];
    const embeddingConfig = await getEmbeddingConfig(app);
    let embeddings;
    if (embeddingConfig.provider === 'pinecone') {
        embeddings = await generateEmbeddingUsingPinecone(app, textArray, inputType);
    } else if (embeddingConfig.provider === 'local') {
        await scheduler.postTask(async () => {
            await initLocalEmbeddingWorker();
            embeddings = await Promise.all(textArray.map(text => generateEmbeddingUsingLocal(text, inputType)));
        }, {priority: 'user-visible'});
    } else {
        throw new Error(`Embedding provider ${embeddingConfig.provider} not supported`);
    }
    return embeddings;
}