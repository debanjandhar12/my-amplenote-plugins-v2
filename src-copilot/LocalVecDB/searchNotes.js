import {getSyncState} from "./getSyncState.js";
import {EmbeddingGeneratorFactory} from "./embeddings/EmbeddingGeneratorFactory.js";
import { DuckDBNotesManager } from "./DuckDB/DuckDBNotesManager.js";
import DuckDBConnectionController from "./DuckDB/DuckDBConnectionController.js";

export const searchNotes = async (app, queryText, queryTextType, {limit = 64,
    isArchived = null, isSharedByMe = null, isSharedWithMe = null, isTaskListNote = null}) => {
    if (await getSyncState(app) === 'Not synced')
        throw new Error('No syncing has been performed, or the last sync is outdated. Please sync your notes with LocalVecDB.');

    if (!queryText || !queryText.trim()) return [];

    const dbm = new DuckDBNotesManager();
    await DuckDBConnectionController.lockAutoTerminate();
    try {
        // Get embeddings for the query text
        const embeddingGenerator = await EmbeddingGeneratorFactory.create(app);
        const queryVector = (await embeddingGenerator.generateEmbedding(app, queryText, queryTextType || "query"))[0];
        const results = await dbm.searchNoteRecordByRRF(queryText, queryVector, {
            limit,
            isArchived,
            isSharedByMe,
            isSharedWithMe,
            isTaskListNote
        });
        DuckDBConnectionController.unlockAutoTerminate();
        return results;
    } catch (e) {
        DuckDBConnectionController.unlockAutoTerminate();
        throw new Error(`Error querying vectors: ${e}`);
    }
}
