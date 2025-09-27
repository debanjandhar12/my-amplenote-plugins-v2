import {EmbeddingGeneratorBase} from "./EmbeddingGeneratorBase.js";
import 'scheduler-polyfill';
import workerString from 'inline:./LocalEmbeddingGenerator.worker.js';
import {createWorkerFromString} from "../../../common-utils/embed-workers.js";

export class LocalEmbeddingGenerator extends EmbeddingGeneratorBase {
    constructor() {
        super('Xenova/jina-embeddings-v2-small-en', 0, true, Math.max(navigator?.hardwareConcurrency - 2 || 1, 1));
    }

    async generateEmbedding(app, textArray, inputType) {
        let embeddings;
        await scheduler.postTask(async () => {
            await LocalEmbeddingWorkerManager.initLocalEmbeddingWorker();
            textArray = this.getProcessedTextArray(textArray, inputType,
            "", "");
            embeddings = await LocalEmbeddingWorkerManager.generateEmbeddingUsingWorker(textArray, this.MODEL_NAME);
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

class LocalEmbeddingWorkerManager {
    static embeddingWorker = null;
    static messagePromises = new Map();

    static isWorkerSupported() {
        return window.Worker;
    }
    static initLocalEmbeddingWorker() {
        if (LocalEmbeddingWorkerManager.embeddingWorker) return;

        if (!LocalEmbeddingWorkerManager.isWorkerSupported()) {
            throw new Error("Worker is not supported in current browser. It is required for local embedding. Please use a different embedding provider.");
        }

        LocalEmbeddingWorkerManager.embeddingWorker = createWorkerFromString(workerString);

        LocalEmbeddingWorkerManager.embeddingWorker.onmessage = (event) => {
            const { messageId, error, result } = event.data;
            if (LocalEmbeddingWorkerManager.messagePromises.has(messageId)) {
                const { resolve, reject } = LocalEmbeddingWorkerManager.messagePromises.get(messageId);
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(result);
                }
                LocalEmbeddingWorkerManager.messagePromises.delete(messageId);
            }
        };
    }

    static async generateEmbeddingUsingWorker(textArray, model) {
        if (!LocalEmbeddingWorkerManager.embeddingWorker) {
            LocalEmbeddingWorkerManager.initLocalEmbeddingWorker();
        }

        const messageId = Date.now() + Math.random();
        const promise = new Promise((resolve, reject) => {
            LocalEmbeddingWorkerManager.messagePromises.set(messageId, { resolve, reject });
        });

        const webGpuAvailable = await new LocalEmbeddingGenerator().isWebGpuAvailable();

        LocalEmbeddingWorkerManager.embeddingWorker.postMessage({
            textArray,
            model,
            webGpuAvailable,
            messageId
        });

        return promise;
    }
}