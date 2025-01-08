import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {PINECONE_API_KEY_SETTING} from "../../constants.js";
import {getEmbeddingConfig} from "./getEmbeddingConfig.js";

export async function generateEmbeddingUsingPinecone(app, textArray, inputType) {
    if (!window.pineconeClient) {
        const {Pinecone} = await dynamicImportESM("@pinecone-database/pinecone");
        window.pineconeClient = new Pinecone({
            apiKey: app.settings[PINECONE_API_KEY_SETTING],
        });
    }
    const embeddingConfig = await getEmbeddingConfig(app);
    const embeddings = await pineconeClient.inference.embed(
        embeddingConfig.model,
        textArray,
        {inputType, truncate: 'END'}
    );
    if (textArray.length >= 16) {    // Don't wait for small requests
        // Wait for few seconds to avoid rate limit of 250k tokens / min
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return embeddings.map(embedding => embedding.values);
}