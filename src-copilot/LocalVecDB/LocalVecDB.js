// **
// ** This is a local vector db implementation based on IndexedDB.
// **
import {syncNotes} from "./syncNotes.js";
import {searchNotes} from "./searchNotes.js";
import {searchHelpCenter} from "./searchHelpCenter.js";
import {getSyncState} from "./getSyncState.js";


let syncNotesPromise;
export class LocalVecDB {
    async searchNotes(app, query, queryTextType, opts) {
        return await searchNotes(app, query, queryTextType, opts);
    }

    async syncNotes(app, sendMessageToEmbed) {
        // If there's no active sync promise, create one.
        if (!syncNotesPromise) {
            syncNotesPromise = syncNotes(app, sendMessageToEmbed)
                .finally(() => {
                    syncNotesPromise = null;
                });
        }

        // Return the currently active sync promise.
        return syncNotesPromise;
    }

    async getSyncState(app) {
        return await getSyncState(app, syncNotesPromise);
    }

    async searchHelpCenter(app, query, opts) {
        return await searchHelpCenter(app, query, opts);
    }


}
