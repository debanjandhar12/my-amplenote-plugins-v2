import {createEasyWebWorker} from "easy-web-worker";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";

export async function generateEmbeddingUsingLocal(text, inputType) {
    const inputText = inputType === 'query' ? "Represent this sentence for searching relevant passages: " + text
        : text;
    const embeddingConfig = await getEmbeddingConfig();
    return await generateEmbeddingWorker.send({inputText, model: embeddingConfig.model, webGpuAvailable: embeddingConfig.webGpuAvailable});
}

const generateEmbeddingWorker = createEasyWebWorker(({ onMessage }) => {
    let pipeline, embeddingPipe, currentlyRunning = false;
    const generateEmbedding = async (inputText, opts) => {
        currentlyRunning = true;
        if (!pipeline) {
            // We cannot use dynamicImportEsm inside workers yet.
            // This is ok for now as connection to jsdelivr is mandatory for huggingface to load models anyway.
            pipeline = (await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4')).pipeline;
        }
        if (!embeddingPipe) {
            if (opts.webGpuAvailable) {
                embeddingPipe = await pipeline('feature-extraction', opts.model, {
                    dtype: 'q8',
                    device: 'webgpu'
                });
            } else {
                embeddingPipe = await pipeline('feature-extraction', opts.model, {
                    dtype: 'q8',
                    device: 'wasm'
                });
            }
        }
        const output = await embeddingPipe(inputText, {
            pooling: 'mean',
            normalize: true,
        });
        currentlyRunning = false;
        return Array.from(output.data);
    };

    onMessage(async (message) => {
        const { payload } = message;
        const { inputText, model, webGpuAvailable } = payload;
        try {
            const result = await generateEmbedding(inputText, { model, webGpuAvailable });
            message.resolve(result);
        } catch (e) {
            message.reject(e);
        }
    });
}, {
    keepAlive: false,
    maxWorkers: getEmbeddingConfig().maxConcurrency,
    terminationDelay: 30000});
