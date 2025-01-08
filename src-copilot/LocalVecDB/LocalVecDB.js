// **
// ** This is a local vector db implementation based on IndexedDB.
// **
import {syncNotes} from "./syncNotes.js";
import {search} from "./search.js";
import {isSyncRequired} from "./isSyncRequired.js";

export class LocalVecDB {
    async search(app, query, limit) {
        return await search(app, query, limit);
    }

    async syncNotes(app, sendMessageToEmbed) {
        await syncNotes(app, sendMessageToEmbed);
    }

    async isSyncRequired(app) {
        return await isSyncRequired(app);
    }
}