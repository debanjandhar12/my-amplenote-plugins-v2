import dynamicImportESM, {dynamicImportExternalPluginBundle} from "../../common-utils/dynamic-import-esm.js";
import {getEmbeddingProviderName} from "./embeddings/getEmbeddingProviderName.js";
import {IndexedDBManager} from "./IndexedDBManager.js";

export const loadHelpCenterEmbeddings = async (app) => {
    const embeddingConfig = getEmbeddingProviderName(app);
    const indexedDBManager = new IndexedDBManager();
    const allHelpCenterEmbeddings = await indexedDBManager.getAllHelpCenterEmbeddings();
    const lastLoadHelpCenterEmbeddingProvider = await indexedDBManager.getConfigValue('lastLoadHelpCenterEmbeddingProvider');

    if (lastLoadHelpCenterEmbeddingProvider &&
        lastLoadHelpCenterEmbeddingProvider === embeddingConfig.provider &&
        allHelpCenterEmbeddings.length > 0) {
        await indexedDBManager.closeDB();
        return;
    }

    let jsonFileName;
    if (embeddingConfig.provider === 'local' || embeddingConfig.provider === 'ollama') {
        jsonFileName = 'localHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingConfig.provider === 'openai') {
        jsonFileName = 'openaiHelpCenterEmbeddings.json.gz';
    }
    else if (embeddingConfig.provider === 'fireworks') {
        jsonFileName = 'fireworksHelpCenterEmbeddings.json.gz';
    }
    else throw new Error(`Embedding provider ${embeddingConfig.provider} not supported`);

    const file = await dynamicImportExternalPluginBundle(jsonFileName, { isESM: false });
    const fflate = await dynamicImportESM("fflate");
    const fileContent = new TextDecoder().decode(fflate.decompressSync(file));
    const helpCenterEmbeddings = JSON.parse(fileContent);
    await indexedDBManager.clearHelpCenterEmbeddings();
    await indexedDBManager.putMultipleHelpCenterEmbeddings(helpCenterEmbeddings);
    await indexedDBManager.setConfigValue('lastLoadHelpCenterEmbeddingProvider', embeddingConfig.provider);

    await indexedDBManager.closeDB();
}
