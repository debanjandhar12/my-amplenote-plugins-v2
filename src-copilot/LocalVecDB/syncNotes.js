import {IndexedDBManager} from "./IndexedDBManager.js";
import {Splitter} from "./splitter/Splitter.js";
import {LOCAL_VEC_DB_MAX_TOKENS, MAX_NOTE_BATCH_SIZE} from "../constants.js";
import {chunk} from "lodash-es";
import {getEmbeddingProviderName} from "./embeddings/getEmbeddingProviderName.js";
import 'scheduler-polyfill';
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import DuckDBWorkerManager from "./DuckDB/DuckDBWorkerManager.js";
import {DuckDBManager} from "./DuckDB/DuckDBManager.js";

export const syncNotes = async (app, sendMessageToEmbed) => {
    try {
        // -- Initialize --
        const performanceStartTime = performance.now();
        const dbm = new DuckDBManager();
        console.log('LOCAL_VEC_DB_INDEX_VERSION', await dbm.getConfigValue('LOCAL_VEC_DB_INDEX_VERSION'));
        //
        // const indexedDBManager = new IndexedDBManager();
        // const embeddingProviderName = getEmbeddingProviderName(app);
        // const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        // let lastSyncTime = await indexedDBManager.getConfigValue('lastSyncTime')
        //     || new Date(0).toISOString();
        // const lastPluginUUID = await indexedDBManager.getConfigValue('lastPluginUUID');
        // const lastEmbeddingModel = await indexedDBManager.getConfigValue('lastEmbeddingModel');
        //
        // // -- Reset DB if plugin UUID / embedding model has changed --
        // if (lastPluginUUID !== app.context.pluginUUID || lastEmbeddingModel !== embeddingGenerator.MODEL_NAME) {
        //     await indexedDBManager.resetDB();
        //     lastSyncTime = new Date(0).toISOString();
        // }
        //
        // // -- Fetch target notes from amplenote --
        // const allNotes = await app.filterNotes({});
        // const targetNotes = filterAndSortNotes(allNotes, lastSyncTime);
        //
        // // Process notes in batches
        // const noteBatches = chunk(targetNotes, MAX_NOTE_BATCH_SIZE);
        //
        // const totalNoteCount = allNotes.length;
        // let processedNoteCount = totalNoteCount - targetNotes.length;
        //
        // // Write log statistics before processing all noteBatches
        // await writeLogStats(app, noteBatches, processedNoteCount, totalNoteCount, indexedDBManager);
        //
        // // Process each batch of notes
        // for (const [batchIndex, noteBatch] of noteBatches.entries()) {
        //     await scheduler.postTask(async () => {
        //         // Process this batch
        //         const batchRecords = await processNoteBatch(app, noteBatch, sendMessageToEmbed, processedNoteCount, totalNoteCount);
        //
        //         // Ask for cost confirmation if this is the first batch
        //         if (batchIndex === 0) {
        //             const shouldContinue = await confirmEmbeddingCost(app, embeddingGenerator, batchRecords.length*noteBatches.length*2, sendMessageToEmbed);
        //             if (!shouldContinue) return false;
        //         }
        //
        //         // Process embeddings and store in DB for this batch
        //         await processAndStoreEmbeddings(
        //             app,
        //             batchRecords,
        //             embeddingGenerator,
        //             embeddingProviderName,
        //             indexedDBManager,
        //             targetNotes,
        //             sendMessageToEmbed,
        //             processedNoteCount,
        //             totalNoteCount
        //         );
        //
        //         processedNoteCount += noteBatch.length;
        //
        //         // Update configs after each batch for resumability
        //         await updateSyncConfigs(indexedDBManager, app.context.pluginUUID, embeddingGenerator.MODEL_NAME);
        //     }, {priority: 'background'});
        // }
        //
        // // Final update of sync time
        // await indexedDBManager.setConfigValue('lastSyncTime', new Date().toISOString());
        // await indexedDBManager.closeDB();
        //
        // console.log('syncNotes perf:', performance.now() - performanceStartTime, ', note count:', targetNotes.length);
        // sendMessageToEmbed(app, 'syncNotesProgress', `${totalNoteCount}/${totalNoteCount}<br />Sync Completed!`);
        // app.alert("Sync completed!");
        // return true;
    } catch (e) {
        console.error('syncNotes error:', e);
        sendMessageToEmbed(app, 'syncNotesProgress', `Error: ${e.message}`);
        app.alert("Sync failed: " + e.message);
        throw e;
    }
}

// ======== Helper functions ========
function filterAndSortNotes(allNotes, lastSyncTime) {
    return allNotes
        // Filter out notes that are already synced
        .filter(note => {
            try {
                const parsedCreatedAt = new Date(note.created || note.createdAt);
                const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
                const parsedLastSyncTime = new Date(lastSyncTime);
                if (parsedCreatedAt == null || parsedUpdatedAt == null) return true;
                return parsedUpdatedAt > parsedLastSyncTime || parsedCreatedAt > parsedLastSyncTime;
            } catch (e) {
                return true;
            }
        })
        // Sort by updatedAt ascending
        .sort((a, b) => {
            try {
                const aParsedUpdatedAt = new Date(a.updated || a.updatedAt);
                const bParsedUpdatedAt = new Date(b.updated || b.updatedAt);
                if (aParsedUpdatedAt.toISOString() !== bParsedUpdatedAt.toISOString()) {
                    return aParsedUpdatedAt - bParsedUpdatedAt;
                }
                return a.uuid.localeCompare(b.uuid);
            } catch (e) {
                return -1;
            }
        });
}

async function processNoteBatch(app, noteBatch, sendMessageToEmbed, processedNoteCount, totalNoteCount) {
    const batchRecords = [];

    sendMessageToEmbed(app, 'syncNotesProgress',
        `Scanning Notes: ${processedNoteCount}/${totalNoteCount}`);

    for (const [index, note] of noteBatch.entries()) {
        const splitter = new Splitter(LOCAL_VEC_DB_MAX_TOKENS);
        const splitResultForNote = await splitter.splitNote(app, note);
        batchRecords.push(...splitResultForNote);
    }

    return batchRecords;
}

async function confirmEmbeddingCost(app, embeddingGenerator, recordCount, sendMessageToEmbed) {
    await new Promise(resolve => setTimeout(resolve, 120));
    const cost = await embeddingGenerator.getEmbeddingCost(app, recordCount);
    if (cost > 0) {
        sendMessageToEmbed(app, 'syncNotesProgress', `Waiting for user confirmation...`);
        const confirm = await app.prompt(`The sync operation will cost $${cost} approximately. Do you want to continue?`, {
            inputs: []
        });
        return confirm;
    }
    return true;
}

async function processAndStoreEmbeddings(
    app, 
    records, 
    embeddingGenerator, 
    embeddingProviderName, 
    indexedDBManager, 
    targetNotes, 
    sendMessageToEmbed,
    processedNoteCount,
    totalNoteCount
) {
    if (records.length === 0) return;
    
    // Delete existing records for these notes
    const noteUUIDs = [...new Set(records.map(record => record.noteUUID))];
    await indexedDBManager.deleteNoteEmbeddingByNoteUUIDList(noteUUIDs);

    // Process in chunks based on embedding model's concurrency limit
    const chunkSize = embeddingGenerator.MAX_CONCURRENCY;
    const recordsChunks = chunk(records, chunkSize);
    
    for (const [chunkIndex, recordChunk] of recordsChunks.entries()) {
        // Update progress
        const gpuInfo = embeddingProviderName === 'local' ?
            ` with ${(await embeddingGenerator.isWebGpuAvailable()) ? 'gpu' : 'cpu'}` : '';
        const localWarning = embeddingProviderName === 'local' ?
            `<br /><small style="opacity: 0.8;">(💡 Enter embedding api url and key in plugin settings for faster sync)</small>` : '';
        sendMessageToEmbed(app, 'syncNotesProgress',
            `Generating Embeddings: ${processedNoteCount
            + Math.floor((noteUUIDs.length/recordsChunks.length)*chunkIndex)}/${totalNoteCount}<br />` +
            `[using ${embeddingProviderName} embedding${gpuInfo}]${localWarning}`);

        // Generate embeddings
        const embeddings = await embeddingGenerator.generateEmbedding(
            app,
            recordChunk.map(record => record.processedNoteContent),
            'passage'
        );
        
        // Add embeddings to records
        embeddings.forEach((embedding, index) => {
            recordChunk[index].values = embedding;
        });
        
        // Store in database
        await indexedDBManager.putMultipleNoteEmbedding(recordChunk);
        
        // Update last sync time for resumability
        try {
            const lastNoteInChunk = recordChunk[recordChunk.length-1];
            const note = targetNotes.find(n => n.uuid === lastNoteInChunk.noteUUID);
            if (note) {
                const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
                parsedUpdatedAt.setSeconds(parsedUpdatedAt.getSeconds() - 1);
                await indexedDBManager.setConfigValue('lastSyncTime', parsedUpdatedAt.toISOString());
            }
        } catch (e) {
            console.error("Error updating last sync time:", e);
        }
    }
}

async function updateSyncConfigs(indexedDBManager, pluginUUID, modelName) {
    await indexedDBManager.setConfigValue('lastPluginUUID', pluginUUID);
    await indexedDBManager.setConfigValue('lastEmbeddingModel', modelName);
}

async function writeLogStats(app, noteBatches, processedNoteCount, totalNoteCount, indexedDBManager) {
    try {
        // Get user agent
        const userAgent = navigator.userAgent;

        // Get RAM information
        let ramInfo = 'Memory info not available';
        try {
            if (performance.memory) {
                const usedJSHeapSize = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                const totalJSHeapSize = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
                const jsHeapSizeLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
                ramInfo = `Used: ${usedJSHeapSize}MB, Total: ${totalJSHeapSize}MB, Limit: ${jsHeapSizeLimit}MB`;
            }
        } catch (e) {}

        // Get embedding provider name
        const embeddingProviderName = getEmbeddingProviderName(app);

        // Get IndexedDB items count and storage space
        let indexedDBEmbeddingCount = 0;
        let storageSpace = 'Storage info not available';
        try {
            indexedDBEmbeddingCount = await indexedDBManager.getAllNotesEmbeddingsCount();
            storageSpace = await indexedDBManager.getRemainingStorageSpace();
        } catch (e) {
            // Silently fail, keep defaults
        }

        console.log(
            `%c=== Starting Sync ===\n` +
            `%cPlugin UUID: ${app.context.pluginUUID}\n` +
            `User Agent: ${userAgent}\n` +
            `RAM: ${ramInfo}\n` +
            `Embedding Provider: ${embeddingProviderName}\n` +
            `Existing Progress: ${processedNoteCount}/${totalNoteCount}\n` +
            `Remaining NoteBatches count: ${noteBatches.length}\n` +
            `IndexedDB embedding count: ${indexedDBEmbeddingCount}\n` +
            `IndexedDB Remaining Storage space: ${storageSpace}\n` +
            `%c=====================`,
            'color: white; background-color: green; font-weight: bold; font-size: 14px; padding: 2px;',
            'color: white; background-color: #333; font-size: 13px; padding: 2px;',
            'color: white; background-color: green; font-weight: bold; font-size: 14px; padding: 2px;'
        );
    } catch (error) {
        console.error('Error writing log stats:', error);
    }
}


