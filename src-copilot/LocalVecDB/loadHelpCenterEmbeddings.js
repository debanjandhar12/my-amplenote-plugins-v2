import dynamicImportESM, {dynamicImportExternalPluginBundle} from "../../common-utils/dynamic-import-esm.js";
import {getEmbeddingProviderName} from "./embeddings/getEmbeddingProviderName.js";
import {IndexedDBManager} from "./IndexedDBManager.js";

export const loadHelpCenterEmbeddings = async (app) => {
    const embeddingProviderName = getEmbeddingProviderName(app);
    const indexedDBManager = new IndexedDBManager();
    const allHelpCenterEmbeddings = await indexedDBManager.getAllHelpCenterEmbeddings();
    const lastLoadHelpCenterEmbeddingProvider = await indexedDBManager.getConfigValue('lastLoadHelpCenterEmbeddingProvider');

    if (lastLoadHelpCenterEmbeddingProvider &&
        lastLoadHelpCenterEmbeddingProvider === embeddingProviderName &&
        allHelpCenterEmbeddings.length > 0) {
        return;
    }

    let jsonFileName;
    if (embeddingProviderName === 'local' || embeddingProviderName === 'ollama') {
        jsonFileName = 'localHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingProviderName === 'openai') {
        jsonFileName = 'openaiHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingProviderName === 'google') {
        jsonFileName = 'googleHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingProviderName === 'fireworks') {
        jsonFileName = 'fireworksHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingProviderName === 'pinecone') {
        jsonFileName = 'pineconeHelpCenterEmbeddings.json.gz';
    }
    else throw new Error(`Embedding provider ${embeddingProviderName} not supported`);

    const file = await dynamicImportExternalPluginBundle(jsonFileName, { isESM: false });
    const fflate = await dynamicImportESM("fflate");
    const fileContent = new TextDecoder().decode(fflate.decompressSync(file));
    const helpCenterEmbeddings = JSON.parse(fileContent);
    await indexedDBManager.clearHelpCenterEmbeddings();
    await indexedDBManager.putMultipleHelpCenterEmbeddings(helpCenterEmbeddings);
    await indexedDBManager.setConfigValue('lastLoadHelpCenterEmbeddingProvider', embeddingProviderName);
    await indexedDBManager.closeDB();
}
