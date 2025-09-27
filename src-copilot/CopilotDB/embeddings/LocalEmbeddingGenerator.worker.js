import {COPILOT_DB_MAX_TOKENS} from "../../constants.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

let embeddingPipe, embeddingPipeModel, mutex;

onmessage = async (e) => {
    const { messageId, textArray, model, webGpuAvailable } = e.data;
    try {
        const result = await generateEmbedding(textArray, { model, webGpuAvailable });
        postMessage({ messageId, result });
    } catch (err) {
        postMessage({ messageId, error: err.toString() });
    }
};

async function generateEmbedding(textArray, opts) {
    if (!mutex) {
        const asyncMutexPkg = await dynamicImportESM("async-mutex");
        mutex = new asyncMutexPkg.Mutex();
    }
    const release = await mutex.acquire();
    if (!embeddingPipe || embeddingPipeModel !== opts.model) {
      const huggingfacePkg = await dynamicImportESM("@huggingface/transformers");
      huggingfacePkg.env.useWorker = false;
      const pipeline = (huggingfacePkg).pipeline;
      embeddingPipe = await pipeline('feature-extraction', opts.model, {
        dtype: opts.webGpuAvailable ? 'fp16' : 'q8',
        device: opts.webGpuAvailable ? 'webgpu' : 'wasm'
      });
      embeddingPipeModel = opts.model;
    }
    const output = await embeddingPipe(textArray, {
      pooling: 'mean',
      normalize: true,
      truncate: true,
      max_length: COPILOT_DB_MAX_TOKENS
    });

    release();
    const [batchSize, embeddingDim] = output.dims;
    return Array.from(
        { length: batchSize },
        (_, i) => output.data.slice(i * embeddingDim, (i + 1) * embeddingDim)
    );
}