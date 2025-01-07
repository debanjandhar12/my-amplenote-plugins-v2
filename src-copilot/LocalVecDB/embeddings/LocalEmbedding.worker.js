import {createEasyWebWorker} from "easy-web-worker";

export const localEmbeddingWorker = createEasyWebWorker(({ onMessage }) => {
    let pipeline, embeddingPipe;
    const generateEmbedding = async (inputText) => {
        if (!pipeline) {
            // We cannot use dynamicImportEsm inside workers yet.
            // This is ok for now as connection to jsdelivr is mandatory for huggingface to load models anyway.
            pipeline = (await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4')).pipeline;
        }
        if (!embeddingPipe) {
            embeddingPipe = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
                dtype: 'q8',
                device: 'wasm'
            });
            // Try with GPU
            try {
                if (navigator.gpu) {
                    let embeddingPipeWithGPU = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
                        dtype: 'q8',
                        device: 'webgpu'
                    });
                    const testResult = await embeddingPipeWithGPU("Test", {});
                    if (!testResult.data) throw new Error('GPU test failed');
                    embeddingPipe = embeddingPipeWithGPU;
                    console.log('Using GPU for embedding 🎉');
                }
            } catch (e) {}
        }
        const output = await embeddingPipe(inputText, {
            pooling: 'mean',
            normalize: true,
        });
        return Array.from(output.data);
    };

    onMessage(async (message) => {
        const { payload } = message;
        const { inputText } = payload;
        try {
            const result = await generateEmbedding(inputText);
            message.resolve(result);
        } catch (e) {
            message.reject(e);
        }
    });
}, {maxWorkers: Math.max(navigator.hardwareConcurrency - 1, 1),
    terminationDelay: 60*1000});
