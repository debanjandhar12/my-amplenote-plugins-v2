// **
// ** This is a local vector db implementation based on IndexedDB.
// **
import {syncNotes} from "./syncNotes.js";
import {searchNotes} from "./searchNotes.js";
import {searchHelpCenter} from "./searchHelpCenter.js";
import {getSyncState} from "./getSyncState.js";
import {loadHelpCenterEmbeddings} from "./loadHelpCenterEmbeddings.js";

export class LocalVecDB {
    async searchNotes(app, query, opts) {
        return await searchNotes(app, query, opts);
    }

    async syncNotes(app, sendMessageToEmbed) {
        await syncNotes(app, sendMessageToEmbed);
    }

    async getSyncState(app) {
        return await getSyncState(app);
    }

    async searchHelpCenter(app, query, opts) {
        return await searchHelpCenter(app, query, opts);
    }

    async loadHelpCenterEmbeddings(app) {
        return await loadHelpCenterEmbeddings(app);
    }
}