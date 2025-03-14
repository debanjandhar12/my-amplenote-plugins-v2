import {createEasyWebWorker} from "easy-web-worker";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";

let generateEmbeddingWorker;
export async function initLocalEmbeddingWorker() {
    if (!window.Worker) return;
    if (!generateEmbeddingWorker) {
        const embeddingConfig = await getEmbeddingConfig();
        generateEmbeddingWorker = await createEasyWebWorker(generateEmbeddingWorkerSource, {
            keepAlive: false,
            maxWorkers: embeddingConfig.maxConcurrency,
            terminationDelay: 30000});
    }
}

export async function generateEmbeddingUsingLocal(text, inputType) {
    const inputText = inputType === 'query' ? "Represent this sentence for searching relevant passages: " + text
        : text;
    const embeddingConfig = await getEmbeddingConfig();
    if (!window.Worker) {
        return new Promise((resolve, reject) => {
            generateEmbeddingWorkerSource({onMessage: async (onMessageHandler) => {
                    onMessageHandler({
                        payload: {inputText, model: embeddingConfig.model},
                        reject,
                        resolve
                    });
                }});
        });
    }
    if (!generateEmbeddingWorker) {
        await initLocalEmbeddingWorker();
    }
    return await generateEmbeddingWorker.send({inputText, model: embeddingConfig.model, webGpuAvailable: embeddingConfig.webGpuAvailable});
}

const generateEmbeddingWorkerSource = ({ onMessage }) => {
    let pipeline, embeddingPipe, mutex, tid;
    const generateEmbedding = async (inputText, opts) => {
        if (!tid) {
            tid = Math.random().toString(36).substring(7);
        }
        if (!mutex) {
            mutex = new (await import('https://cdn.jsdelivr.net/npm/async-mutex@0.5.0/+esm')).Mutex();
        }
        const release = await mutex.acquire();
        if (!pipeline) {
            // We cannot use dynamicImportEsm inside workers yet.
            // This is ok for now as connection to jsdelivr is mandatory for huggingface to load models anyway.
            pipeline = (await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4/+esm')).pipeline;
        }
        if (!embeddingPipe) {
            if (opts.webGpuAvailable) {
                embeddingPipe = await pipeline('feature-extraction', opts.model, {
                    dtype: 'fp16',
                    device: 'webgpu'
                });
            } else {
                embeddingPipe = await pipeline('feature-extraction', opts.model, {
                    dtype: 'fp16',
                    device: 'wasm'
                });
            }
        }
        const output = await embeddingPipe(inputText, {
            pooling: 'cls',
            normalize: true,
        });
        release();
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
};