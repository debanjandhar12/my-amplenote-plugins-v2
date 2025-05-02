import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import 'scheduler-polyfill';
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";


export class LocalEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('Snowflake/snowflake-arctic-embed-s', 0, 1);
    }

    async generateEmbedding(app, textArray, inputType) {
        let embeddings;
        await scheduler.postTask(async () => {
            await LocalEmbeddingGeneratorInner.initLocalEmbeddingWorker();
            textArray = this.getProcessedTextArray(textArray, inputType,
            "", "Represent this sentence for searching relevant passages: ");
            embeddings = await Promise.all(textArray.map(text =>
                LocalEmbeddingGeneratorInner.generateEmbeddingUsingLocal(text, inputType)));
        }, {priority: 'user-visible'});
        return embeddings;
    }

    async isWebGpuAvailable() {
        try {
            if (window.gpuAdapter == null && navigator.gpu)
                window.gpuAdapter = await navigator.gpu.requestAdapter() || false;
        } catch (e) {}
        return window.gpuAdapter !== false && window.gpuAdapter !== null
            && window.gpuAdapter !== undefined && window.gpuAdapter.features.has("shader-f16");
    }
}

class LocalEmbeddingGeneratorInner {
    static generateEmbeddingWorker = null;

    static async initLocalEmbeddingWorker() {
        if (!window.Worker) return;
        if (!LocalEmbeddingGeneratorInner.generateEmbeddingWorker) {
            const embeddingGenerator = new LocalEmbeddingGenerator();
            const {createEasyWebWorker} = await dynamicImportESM('easy-web-worker');
            LocalEmbeddingGeneratorInner.generateEmbeddingWorker = await createEasyWebWorker(generateEmbeddingWorkerSource, {
                keepAlive: false,
                maxWorkers: embeddingGenerator.MAX_CONCURRENCY,
                terminationDelay: 30000});
            await LocalEmbeddingGeneratorInner.generateEmbeddingUsingLocal('test', 'query');
        }
    }
    static async generateEmbeddingUsingLocal(text, inputType) {
        const inputText = inputType === 'query' ? "Represent this sentence for searching relevant passages: " + text
            : text;
        const embeddingGenerator = new LocalEmbeddingGenerator();
        if (!window.Worker) {
            return new Promise((resolve, reject) => {
                generateEmbeddingWorkerSource({onMessage: async (onMessageHandler) => {
                        onMessageHandler({
                            payload: {inputText, model: embeddingGenerator.MODEL_NAME},
                            reject,
                            resolve
                        });
                    }});
            });
        }
        if (!LocalEmbeddingGeneratorInner.generateEmbeddingWorker) {
            await LocalEmbeddingGeneratorInner.initLocalEmbeddingWorker();
        }
        return await LocalEmbeddingGeneratorInner.generateEmbeddingWorker.send({inputText, model: embeddingGenerator.MODEL_NAME, webGpuAvailable: await embeddingGenerator.isWebGpuAvailable()});
    }
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
            pipeline = (await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm')).pipeline;
        }
        if (!embeddingPipe) {
            if (opts.webGpuAvailable) {
                embeddingPipe = await pipeline('feature-extraction', opts.model, {
                    dtype: 'fp16',
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