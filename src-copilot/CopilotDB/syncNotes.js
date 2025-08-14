import { Splitter } from "./splitter/Splitter.js";
import { COPILOT_DB_INDEX_VERSION, COPILOT_DB_MAX_TOKENS, MAX_NOTE_BATCH_SIZE } from "../constants.js";
import { chunk } from "lodash-es";
import { getEmbeddingProviderName } from "./embeddings/getEmbeddingProviderName.js";
import 'scheduler-polyfill';
import { EmbeddingGeneratorFactory } from "./embeddings/EmbeddingGeneratorFactory.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";
import { DuckDBNotesManager } from "./DuckDB/DuckDBNotesManager.js";
import { OPFSUtils } from "./DuckDB/OPFSUtils.js";

// console.log('COPILOT_DB_INDEX_VERSION', await dbm.getConfigValue('COPILOT_DB_INDEX_VERSION'));
// console.log('getAllNotesEmbeddingsCountBefore', await dbm.getAllNotesEmbeddingsCount());
// console.log('putMultipleNoteEmbedding', await dbm.putMultipleNoteEmbedding([{
//     id: 'id1',
//     noteUUID: 'uuid1',
//     noteTitle: 'title1',
//     actualNoteContentPart: 'content1',
//     processedNoteContent: 'processedContent1',
//     isPublished: true,
//     noteTags: ['tag1)));SELECT'],
//     embeddings: [0.1234, 0.2, 0.3]
// }]));
// console.log('getNoteCountInNoteEmbeddings', await dbm.getNoteCountInNoteEmbeddings());
// console.log('searchNoteEmbedding', await dbm.searchNoteEmbedding(new Float32Array([0.1234, 0.2, 0.3])));
// console.log('getAllNotesEmbeddingsCountAfter', await dbm.getAllNotesEmbeddingsCount());
//         // console.log('deleteNoteEmbeddingByNoteUUIDList', await dbm.deleteNoteEmbeddingByNoteUUIDList(['uuid1', 'uuid2']));
// console.log('resetDB', await dbm.resetDB());

export const syncNotes = async (app, sendMessageToEmbed) => {
    // Generate random sync ID at the very beginning
    const syncId = COPILOT_DB_INDEX_VERSION + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    try {
        // -- Initialize --
        const performanceStartTime = performance.now();



        if (!await OPFSUtils.checkSupport()) {
            throw new Error('OPFS is not supported in this browser. It is required for CopilotDB.');
        }
        if (!await OPFSUtils.isPersisted() && !await OPFSUtils.askStoragePermission()) {
            const confirm = await app.prompt(`OPFS is not persisted. The browser may delete the indexed data. For better reliability, it's recommended to enable persistent storage. Do you want to ignore this and continue anyway?`, {
                inputs: []
            });
            if (!confirm) {
                return;
            }
        }

        sendMessageToEmbed(app, 'syncNotesProgress', `Starting sync...`);
        const dbm = await DuckDBNotesManager.getInstance();
        await DuckDBConnectionController.lockAutoTerminate();

        // Write initial log statistics
        await writeLogStats(app, null, 0, 0, dbm, syncId, 'start');
        const embeddingProviderName = getEmbeddingProviderName(app);
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        let lastSyncTime = await dbm.getConfigValue('lastSyncTime')
            || new Date(0).toISOString();
        const lastPluginUUID = await dbm.getConfigValue('lastPluginUUID');
        const lastEmbeddingModel = await dbm.getConfigValue('lastEmbeddingModel');

        // -- Reset DB if plugin UUID / embedding model has changed --
        if (lastPluginUUID !== app.context.pluginUUID ||
            lastEmbeddingModel !== embeddingGenerator.MODEL_NAME) {
            await dbm.resetDB();
            lastSyncTime = new Date(0).toISOString();
        }
        // -- Fetch target notes from amplenote --
        const allNotes = await app.filterNotes({});
        const targetNotes = filterAndSortNotes(allNotes, lastSyncTime);

        // Process notes in batches
        const noteBatches = chunk(targetNotes, MAX_NOTE_BATCH_SIZE);

        const totalNoteCount = allNotes.length;
        let processedNoteCount = totalNoteCount - targetNotes.length;

        // Write log statistics before processing all noteBatches
        await writeLogStats(app, noteBatches, processedNoteCount, totalNoteCount, dbm, syncId, 'progress');

        // Clear notes that were deleted
        sendMessageToEmbed(app, 'syncNotesProgress', `Sanitizing database...`);
        await scheduler.postTask(async () => {
            await dbm.deleteNoteRecordByNoteUUIDNotInList(allNotes.map(note => note.uuid));
        }, { priority: 'background' });

        // Process each batch of notes
        for (const [batchIndex, noteBatch] of noteBatches.entries()) {
            let batchRecords = [];
            await scheduler.postTask(async () => {
                batchRecords = await processNoteBatch(app, noteBatch, sendMessageToEmbed, processedNoteCount, totalNoteCount);
            }, { priority: 'background' });

            // Ask for cost confirmation if this is the first batch
            if (batchIndex === 0) {
                const shouldContinue = await confirmEmbeddingCost(app, embeddingGenerator, batchRecords.length * noteBatches.length * 2, sendMessageToEmbed);
                if (!shouldContinue) {
                    await DuckDBConnectionController.unlockAutoTerminate();
                    return false;
                }
            }

            // Process embeddings and store in DB for this batch
            await scheduler.postTask(async () => {
                await processAndStoreEmbeddings(
                    app,
                    batchRecords,
                    embeddingGenerator,
                    embeddingProviderName,
                    dbm,
                    targetNotes,
                    sendMessageToEmbed,
                    processedNoteCount,
                    totalNoteCount
                );

                processedNoteCount += noteBatch.length;

                // Update configs after each batch for resumability
                await updateSyncConfigs(dbm, app.context.pluginUUID, embeddingGenerator.MODEL_NAME);
            }, { priority: 'background' });
        }

        // Final update of sync time - use the last processed note's time
        if (targetNotes.length > 0) {
            const lastProcessedNote = targetNotes[targetNotes.length - 1];
            const lastNoteTime = new Date(lastProcessedNote.updated || lastProcessedNote.updatedAt).toISOString();
            await dbm.setConfigValue('lastSyncTime', lastNoteTime);
        }

        // Update the fts index
        // sendMessageToEmbed(app, 'syncNotesProgress', `Updating index...`);
        // await dbm.updateFTSIndex();

        sendMessageToEmbed(app, 'syncNotesProgress', `${totalNoteCount}/${totalNoteCount}<br />Sync Completed!`);
        await writeLogStats(app, noteBatches, processedNoteCount, totalNoteCount, dbm, syncId, 'end', performance.now() - performanceStartTime);
        app.alert("Sync completed!");
        DuckDBConnectionController.unlockAutoTerminate();
        return true;
    } catch (e) {
        console.error('sync error', e);
        DuckDBConnectionController.unlockAutoTerminate();
        await writeLogStats(app, null, 0, 0, null, syncId, 'error', null, e);
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
        const splitter = new Splitter(COPILOT_DB_MAX_TOKENS);
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
    dbm,
    targetNotes,
    sendMessageToEmbed,
    processedNoteCount,
    totalNoteCount
) {
    if (records.length === 0) return;

    // Delete existing records for these notes
    const noteUUIDs = [...new Set(records.map(record => record.noteUUID))];
    await dbm.deleteNoteRecordByNoteUUIDList(noteUUIDs);

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
            + Math.floor((noteUUIDs.length / recordsChunks.length) * chunkIndex)}/${totalNoteCount}<br />` +
            `[using ${embeddingProviderName} embedding${gpuInfo}]${localWarning}`);

        // Generate embeddings
        const embeddings = await embeddingGenerator.generateEmbedding(
            app,
            recordChunk.map(record => record.processedNoteContent),
            'passage'
        );

        // Add embeddings to records
        embeddings.forEach((embedding, index) => {
            recordChunk[index].embedding = embedding;
        });

        // Store in database
        await dbm.putMultipleNoteEmbedding(recordChunk);

        // Update last sync time for resumability
        try {
            const lastNoteInChunk = recordChunk[recordChunk.length - 1];
            const note = targetNotes.find(n => n.uuid === lastNoteInChunk.noteUUID);
            if (note) {
                const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
                parsedUpdatedAt.setSeconds(parsedUpdatedAt.getSeconds() - 1);
                await dbm.setConfigValue('lastSyncTime', parsedUpdatedAt.toISOString());
            }
        } catch (e) {
            console.error("Error updating last sync time:", e);
        }
    }
}

async function updateSyncConfigs(dbm, pluginUUID, modelName) {
    await dbm.setConfigValue('lastPluginUUID', pluginUUID);
    await dbm.setConfigValue('lastEmbeddingModel', modelName);
}

async function writeLogStats(app, noteBatches, processedNoteCount, totalNoteCount, dbm, syncId, mode, performanceTime, error) {
    try {
        const userAgent = navigator.userAgent;
        const pluginUUID = app.context.pluginUUID || 'unknown';

        let ramInfo = 'Memory info not available';
        let usedJSHeapSize = 0, totalJSHeapSize = 0, jsHeapSizeLimit = 0;
        if (performance.memory) {
            usedJSHeapSize = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            totalJSHeapSize = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            jsHeapSizeLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
            ramInfo = `Used: ${usedJSHeapSize}MB, Total: ${totalJSHeapSize}MB, Limit: ${jsHeapSizeLimit}MB`;
        }

        let storageSpace = 'Storage info not available';
        let isPersisted = false;
        let fileList = [];
        let duckDBRecordCount = 0;
        let embeddingProviderName = 'Unknown';

        try {
            storageSpace = await OPFSUtils.getRemainingStorageSpace();
            isPersisted = await OPFSUtils.isPersisted();
            fileList = await OPFSUtils.getFileList();
            if (dbm) duckDBRecordCount = await dbm.getNotesRecordCount();
            embeddingProviderName = getEmbeddingProviderName(app);
        } catch (e) { }

        // Console logging based on mode
        const colors = {
            start: 'green', progress: 'green', end: 'green', error: 'red'
        };
        const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
        let details = `Plugin UUID: ${pluginUUID}\nUser Agent: ${userAgent}\nRAM: ${ramInfo}\nEmbedding Provider: ${embeddingProviderName}\nOPFS Storage: ${storageSpace}\nOPFS Persisted: ${isPersisted}\nOPFS Files: ${JSON.stringify(fileList)}`;

        if (mode === 'progress') {
            details += `\nProgress: ${processedNoteCount}/${totalNoteCount}\nRemaining Batches: ${noteBatches?.length || 0}\nDuckDB Records: ${duckDBRecordCount}`;
        } else if (mode === 'end') {
            details += `\nDuckDB Records: ${duckDBRecordCount}\nPerformance: ${performanceTime}ms`;
        } else if (mode === 'error') {
            details += `\nError: ${error?.message || 'Unknown error'}\nStack: ${error?.stack || 'No stack trace'}`;
        }

        console.log(
            `%c=== ${modeText} Sync [${syncId}] ===\n%c${details}\n%c=====================`,
            `color: white; background-color: ${colors[mode]}; font-weight: bold; font-size: 14px; padding: 2px;`,
            'color: white; background-color: #333; font-size: 13px; padding: 2px;',
            `color: white; background-color: ${colors[mode]}; font-weight: bold; font-size: 14px; padding: 2px;`
        );
    } catch (error) {
        console.error('Error writing log stats:', error);
    }
}
