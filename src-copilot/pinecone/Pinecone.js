import {syncNotesToPinecone} from "./syncNotesToPinecone.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {LAST_PINECONE_SYNC_TIME_SETTING, PINECONE_API_KEY_SETTING, PINECONE_INDEX_NAME} from "../constants.js";
import {fetchWithFallback, getCorsBypassUrl} from "../../common-utils/cors-helpers.js";

export class Pinecone {
    async syncNotes(app) {
        await syncNotesToPinecone(app);
    }
    async search(query, appSettings, limit = 10) {
        // -- Basic validation --
        if (!appSettings[PINECONE_API_KEY_SETTING]) {
            throw new Error('Pinecone API Key is not set in plugin settings.');
        }
        if (appSettings[LAST_PINECONE_SYNC_TIME_SETTING]) {
            let parsedLastSyncTime = null;
            try {
                parsedLastSyncTime = new Date(appSettings[LAST_PINECONE_SYNC_TIME_SETTING]);
            } catch (e) {}
            if (parsedLastSyncTime && parsedLastSyncTime < new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)) {
                throw new Error('Last pinecone sync was done older than 30 days ago. Please sync notes again.');
            }
        } else {
            throw new Error('Please sync notes to pinecone first.');
        }
        // -- Initialize pinecone client --
        const { Pinecone } = await dynamicImportESM("@pinecone-database/pinecone");
        const pineconeClient = new Pinecone({
            apiKey: appSettings[PINECONE_API_KEY_SETTING],
            fetchApi: async (url, options) => {
                return fetchWithFallback([url, getCorsBypassUrl(url)], options, false);
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
            {inputType: 'query', truncate: 'END'}
        );
        const results = await noteContentNameSpace.query({
            vector: queryVector[0].values,
            topK: limit,
            includeMetadata: true
        });
        return results.matches;
    }
}