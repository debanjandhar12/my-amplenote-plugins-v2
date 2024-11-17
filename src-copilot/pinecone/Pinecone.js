import {syncNotesToPinecone} from "./syncNotesToPinecone.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {PINECONE_API_KEY_SETTING, PINECONE_INDEX_NAME} from "../constants.js";
import {getCorsBypassUrl} from "../../common-utils/cors-helpers.js";

export class Pinecone {
    async syncNotes(app) {
        await syncNotesToPinecone(app);
    }
    async search(query, appSettings, limit = 10) {
        // -- Initialize pinecone client --
        const { Pinecone } = await dynamicImportESM("@pinecone-database/pinecone");
        const pineconeClient = new Pinecone({
            apiKey: appSettings[PINECONE_API_KEY_SETTING],
            fetchApi: (url, options) => {
                url = getCorsBypassUrl(url);
                return fetch(url, options);
            }
        });
        const indexName = PINECONE_INDEX_NAME;
        const indexExists = await pineconeClient.describeIndex(indexName).catch(() => false);
        if (!indexExists) {
            throw new Error('Pinecone index does not exist. Please sync notes to pinecone first.');
        }
        const index = pineconeClient.Index(indexName);
        const noteContentNameSpace = index.namespace('note-content');

        // -- Search --
        const queryVector = await pineconeClient.inference.embed(
            'multilingual-e5-large',
            [query],
            {inputType: 'passage', truncate: 'END'}
        );
        const results = await noteContentNameSpace.query({
            vector: queryVector[0].values,
            topK: limit,
            includeMetadata: true
        });
        return results.matches;
    }
}