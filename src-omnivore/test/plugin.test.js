import {mockApp, mockNote, mockPlugin} from "../../test-helpers/test-helpers.js";
import pluginObject from "../plugin.js"
import {deleteOmnivoreItem, saveOmnivoreItem} from "../omnivore/api-extended.js";
import 'cross-fetch/polyfill';
import {OMINOVRE_API_ENDPOINT, OMNIVORE_API_KEY_SETTING} from "../constants.js";

describe("_fetchDataForSync", () => {
    it('when adding / deleting articles, correct ' +
        'toCreateUpdateNotes, toCreateUpdateNotesDelta, toDeleteNotes needs to be returned', async function() {
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const firstFetch = await plugin._fetchDataForSync.call(plugin, global.app);
        const firstFetchSize = firstFetch.toCreateUpdateNotes.length;
        expect(firstFetch.toCreateUpdateNotes.length).toBe(firstFetch.toCreateUpdateNotesDelta.length);
        expect(firstFetch.toDeleteNotes.length).toBe(0);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT);
        const newItem2 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/commit/dfdb04af9233c4386440db461ac69c9df9e94901",
            OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const secondFetch = await plugin._fetchDataForSync.call(plugin, global.app);
        expect(secondFetch.toCreateUpdateNotesDelta.length).toBe(2);
        expect(secondFetch.toCreateUpdateNotes.length).toBe(firstFetchSize + 2);
        expect(secondFetch.toDeleteNotes.length).toBe(0);


        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, OMINOVRE_API_ENDPOINT);
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem2.id, OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const thirdFetch = await plugin._fetchDataForSync.call(plugin, global.app);
        expect(thirdFetch.toCreateUpdateNotesDelta.length).toBe(0);
        expect(thirdFetch.toCreateUpdateNotes.length).toBe(firstFetchSize);
        expect(thirdFetch.toDeleteNotes.length).toBe(2);
    }, 20000);
    it('should have correct toCreateUpdateNotes and toCreateUpdateNotesDelta ' +
        'when adding highlights to articles', async function() {
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const firstFetch = await plugin._fetchDataForSync.call(plugin, global.app);
        const itemFirstFetch = firstFetch.toCreateUpdateNotes.find(n => n.id === newItem1.id);

        const discard = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT); // Emulate highlights to the article by saving it again
        await new Promise(resolve => setTimeout(resolve, 3000));
        const secondFetch = await plugin._fetchDataForSync.call(plugin, global.app);
        const itemSecondFetch = secondFetch.toCreateUpdateNotes.find(n => n.id === newItem1.id);
        expect(secondFetch.toCreateUpdateNotesDelta.length).toBe(1);
        expect(itemFirstFetch.updatedAt).not.toBe(itemSecondFetch.updatedAt);
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, OMINOVRE_API_ENDPOINT);
    }, 20000);
});