import {mockApp, mockNote, mockPlugin} from "../../common-utils/test-helpers.js";
import pluginObject from "../plugin.js"
import {deleteOmnivoreItem, saveOmnivoreItem} from "../omnivore/api-extended.js";
import 'cross-fetch/polyfill';
import { OMNIVORE_API_KEY_SETTING, OMNIVORE_DASHBOARD_COLUMNS_SETTING} from "../constants.js";
import {generateDashboardTable} from "../amplenote/generate-markdown.js";
import {SAMPLE_OMNIVORE_STATE_DATA} from "./test-data.js";
import MarkdownIt from "markdown-it";
import {sortOmnivoreItemHighlights, sortOmnivoreItems} from "../amplenote/util.js";
import {getOmnivoreApiUrl} from "../omnivore/getOmnivoreUrl.js";

describe("_syncStateWithOmnivore", () => {
    it('when adding / deleting articles, correct ' +
        'omnivoreItemsState, omnivoreItemsStateDelta and omnivoreDeletedItems needs to be returned', async function() {
        if(process.env.OMNIVORE_KEY === undefined || process.env.OMNIVORE_KEY === '') {
            console.warn('Skipping test as OMNIVORE_KEY is not set');
            return;
        }
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        await global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const firstFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const firstFetchSize = firstFetch.omnivoreItemsState.length;
        expect(firstFetch.omnivoreItemsState.length).toBe(firstFetch.omnivoreItemsStateDelta.length);
        expect(firstFetch.omnivoreDeletedItems.length).toBe(0);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            getOmnivoreApiUrl(global.app.settings));
        const newItem2 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/commit/dfdb04af9233c4386440db461ac69c9df9e94901",
            getOmnivoreApiUrl(global.app.settings));
        await new Promise(resolve => setTimeout(resolve, 6000));
        const secondFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        expect(secondFetch.omnivoreItemsStateDelta.length).toBe(2);
        expect(secondFetch.omnivoreItemsState.length).toBe(firstFetchSize + 2);
        expect(secondFetch.omnivoreDeletedItems.length).toBe(0);


        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, getOmnivoreApiUrl(global.app.settings));
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem2.id, getOmnivoreApiUrl(global.app.settings));
        await new Promise(resolve => setTimeout(resolve, 6000));
        const thirdFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        expect(thirdFetch.omnivoreItemsStateDelta.length).toBe(0);
        expect(thirdFetch.omnivoreItemsState.length).toBe(firstFetchSize);
        expect(thirdFetch.omnivoreDeletedItems.length).toBe(2);
    }, 40000);
    it('should have correct omnivoreItemsState and omnivoreItemsStateDelta ' +
        'when adding highlights to articles', async function() {
        if(process.env.OMNIVORE_KEY === undefined || process.env.OMNIVORE_KEY === '') {
            console.warn('Skipping test as OMNIVORE_KEY is not set');
            return;
        }
        const plugin = mockPlugin(pluginObject);
        global.app = mockApp(mockNote("Basic Note", "Name", "1", ""));
        await global.app.setSetting(OMNIVORE_API_KEY_SETTING, process.env.OMNIVORE_KEY);

        const newItem1 = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            getOmnivoreApiUrl(global.app.settings));
        await new Promise(resolve => setTimeout(resolve, 6000));
        const firstFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const itemFirstFetch = firstFetch.omnivoreItemsState.find(n => n.id === newItem1.id);

        const discard = await saveOmnivoreItem(process.env.OMNIVORE_KEY,
            "https://github.com/omnivore-app/omnivore/blob/main/packages/api/src/schema.ts",
            getOmnivoreApiUrl(global.app.settings)); // Emulate highlights to the article by saving it again
        await new Promise(resolve => setTimeout(resolve, 6000));
        const secondFetch = await plugin._syncStateWithOmnivore.call(plugin, global.app);
        const itemSecondFetch = secondFetch.omnivoreItemsState.find(n => n.id === newItem1.id);
        expect(secondFetch.omnivoreItemsStateDelta.length).toBe(1);
        expect(itemFirstFetch.updatedAt).not.toBe(itemSecondFetch.updatedAt);
        await deleteOmnivoreItem(process.env.OMNIVORE_KEY, newItem1.id, getOmnivoreApiUrl(global.app.settings));
    }, 40000);
});


describe('generateDashboardTable - Optional Columns', () => {
    function countColumnsInMarkdownTable(markdown) {
        const md = new MarkdownIt();
        const tokens = md.parse(markdown);
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === 'thead_open') {
                // Find the first row of the table header
                for (let j = i + 1; j < tokens.length; j++) {
                    if (tokens[j].type === 'tr_open') {
                        // Count the number of th_open tokens in this row
                        let columnCount = 0;
                        for (let k = j + 1; k < tokens.length; k++) {
                            if (tokens[k].type === 'th_open') {
                                columnCount++;
                            } else if (tokens[k].type === 'tr_close') {
                                return columnCount;
                            }
                        }
                    }
                }
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
            const markdown = (await generateDashboardTable(omnivoreItemsState, appSettings, () => 'http://example.com')).join('\n');
            const columnCount = countColumnsInMarkdownTable(markdown);
            const expectedColumnCount = fixedColumnsCount + optionalColumns.length;
            expect(columnCount).toBe(expectedColumnCount);
        }
    });
});

describe('Util Function Test', () => {
    const sampleOmnivoreItems = SAMPLE_OMNIVORE_STATE_DATA;

    it('should sort omnivore items by updatedAt in ascending order', () => {
        const sortedItems = sortOmnivoreItems(sampleOmnivoreItems, 'updatedAt-asc');
        expect(sortedItems[0].id).toBe('afc93adc-307b-11ef-8238-ebef1f017e95');
        expect(sortedItems[1].id).toBe('afb5dfa0-307b-11ef-8238-0fcb40206f73');
    });

    it('should sort omnivore items by updatedAt in descending order', () => {
        const sortedItems = sortOmnivoreItems(sampleOmnivoreItems, 'updatedAt-desc');
        expect(sortedItems[0].id).toBe('afb5dfa0-307b-11ef-8238-0fcb40206f73');
        expect(sortedItems[1].id).toBe('afc93adc-307b-11ef-8238-ebef1f017e95');
    });

    it('should sort omnivore items by savedAt in ascending order', () => {
        const sortedItems = sortOmnivoreItems(sampleOmnivoreItems, 'savedAt-asc');
        expect(sortedItems[0].id).toBe('afc93adc-307b-11ef-8238-ebef1f017e95');
        expect(sortedItems[1].id).toBe('afb5dfa0-307b-11ef-8238-0fcb40206f73');
    });
    it('should sort omnivore item highlights by updatedAt in ascending order', () => {
        const sampleOmnivoreItemHighlights = sampleOmnivoreItems[1].highlights;
        const sortedHighlights = sortOmnivoreItemHighlights(sampleOmnivoreItemHighlights, 'updatedAt-asc');
        expect(sortedHighlights[0].id).toBe('a8a53342-a0d1-400f-9d04-f6876ececa96');
        expect(sortedHighlights[1].id).toBe('68c020a9-f776-4061-a138-a62bdd1404e1');
        expect(sortedHighlights[2].id).toBe('bf79e2b0-7d95-4659-8d12-6b6632986571');
    });
    it('should sort omnivore item highlights by updatedAt in descending order', () => {
        const sampleOmnivoreItemHighlights = sampleOmnivoreItems[1].highlights;
        const sortedHighlights = sortOmnivoreItemHighlights(sampleOmnivoreItemHighlights, 'updatedAt-desc');
        expect(sortedHighlights[0].id).toBe('bf79e2b0-7d95-4659-8d12-6b6632986571');
        expect(sortedHighlights[1].id).toBe('68c020a9-f776-4061-a138-a62bdd1404e1');
        expect(sortedHighlights[2].id).toBe('a8a53342-a0d1-400f-9d04-f6876ececa96');
    });
});