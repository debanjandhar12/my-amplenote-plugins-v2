// **
// ** This is a local vector db implementation based on IndexedDB.
// **
import {syncNotes} from "./syncNotes.js";
import {search} from "./search.js";
import {getSyncState} from "./getSyncState.js";

export class LocalVecDB {
    async search(app, query, opts) {
        return await search(app, query, opts);
    }

    async syncNotes(app, sendMessageToEmbed) {
        await syncNotes(app, sendMessageToEmbed);
    }

    async getSyncState(app) {
        return await getSyncState(app);
    }
}