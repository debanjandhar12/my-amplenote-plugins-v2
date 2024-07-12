import {mockApp, mockNote, mockPlugin} from "../../test-helpers/test-helpers.js";
import pluginObject from "../plugin.js"
import {deleteOmnivoreItem, saveOmnivoreItem} from "../omnivore/api-extended.js";
import 'cross-fetch/polyfill';
import {OMINOVRE_API_ENDPOINT, OMNIVORE_API_KEY_SETTING, OMNIVORE_DASHBOARD_COLUMNS_SETTING} from "../constants.js";
import {generateDashboardTable} from "../amplenote/generate-markdown.js";
import {marked} from "marked";
import {SAMPLE_OMNIVORE_STATE_DATA} from "./test-data.js";

describe("_syncStateWithOmnivore", () => {
    it('when adding / deleting articles, correct ' +
        'omnivoreItemsState, omnivoreItemsStateDelta and omnivoreDeletedItems needs to be returned', async function() {
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const firstFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const firstFetchSize = firstFetch.omnivoreItemsState.length;
        expect(firstFetch.omnivoreItemsState.length).toBe(firstFetch.omnivoreItemsStateDelta.length);
        expect(firstFetch.omnivoreDeletedItems.length).toBe(0);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT);
        const newItem2 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/commit/dfdb04af9233c4386440db461ac69c9df9e94901",
            OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 6000));
        const secondFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        expect(secondFetch.omnivoreItemsStateDelta.length).toBe(2);
        expect(secondFetch.omnivoreItemsState.length).toBe(firstFetchSize + 2);
        expect(secondFetch.omnivoreDeletedItems.length).toBe(0);


        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, OMINOVRE_API_ENDPOINT);
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem2.id, OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 6000));
        const thirdFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        expect(thirdFetch.omnivoreItemsStateDelta.length).toBe(0);
        expect(thirdFetch.omnivoreItemsState.length).toBe(firstFetchSize);
        expect(thirdFetch.omnivoreDeletedItems.length).toBe(2);
    }, 40000);
    it('should have correct omnivoreItemsState and omnivoreItemsStateDelta ' +
        'when adding highlights to articles', async function() {
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT);
        await new Promise(resolve => setTimeout(resolve, 6000));
        const firstFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const itemFirstFetch = firstFetch.omnivoreItemsState.find(n => n.id === newItem1.id);

        const discard = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            OMINOVRE_API_ENDPOINT); // Emulate highlights to the article by saving it again
        await new Promise(resolve => setTimeout(resolve, 6000));
        const secondFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const itemSecondFetch = secondFetch.omnivoreItemsState.find(n => n.id === newItem1.id);
        expect(secondFetch.omnivoreItemsStateDelta.length).toBe(1);
        expect(itemFirstFetch.updatedAt).not.toBe(itemSecondFetch.updatedAt);
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, OMINOVRE_API_ENDPOINT);
    }, 40000);
});


describe('generateDashboardTable - Optional Columns', () => {
    function countColumnsInMarkdownTable(markdown) {
        const tokens = marked.lexer(markdown);
        for (const token of tokens) {
            if (token.type === 'table') {
                // Assuming the first row is the header and it defines the number of columns
                return token.header.length;
            }
        }
        return 0; // Return 0 if no table is found
    }
    it('should correctly handle optional columns', async () => {
        const omnivoreItemsState = SAMPLE_OMNIVORE_STATE_DATA;
        const optionalColumnsConfigurations = [
            [],
            ['Author'],
            ['Description', 'UpdatedAt'],
            ['PageType'],
            ['UpdatedAt'],
            ['SavedAt', 'PageType', 'ReadingProgressPercent']
        ];
        const fixedColumnsCount = 3; // Cover, Title, Omnivore Link

        for (const optionalColumns of optionalColumnsConfigurations) {
            const appSettings = {};
            appSettings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] = optionalColumns.join(',');
            const markdown = await generateDashboardTable(omnivoreItemsState, appSettings, () => 'http://example.com');
            const columnCount = countColumnsInMarkdownTable(markdown);
            const expectedColumnCount = fixedColumnsCount + optionalColumns.length;
            expect(columnCount).toBe(expectedColumnCount);
        }
    });
});