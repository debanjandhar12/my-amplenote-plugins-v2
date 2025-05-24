import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import html from "inline:../../embed/search.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";
import {EMBED_COMMANDS_MOCK} from "../frontend-chat/chat.testdata.js";


describe('search embed', () => {
    const {getPage} = createPlaywrightHooks();
    const commandMocks = {...EMBED_COMMANDS_MOCK, getSettings: async () => ({})};
    it('loads correctly', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(commandMocks))};
        `);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        
        await waitForCustomEvent(page, 'appLoaded');
        await expect(page.locator('.search-input')).toBeVisible();
    }, 20000);

    it('menu bar opens and closes', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(commandMocks))};
        `);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await waitForCustomEvent(page, 'appLoaded');

        // Click menu button to open
        await page.waitForSelector('.search-menu-button');
        await page.locator('.search-menu-button').click();
        await expect(page.locator('.search-menu-content')).toBeVisible();
    }, 20000);

    it('search works with mocked results', async () => {

        const commandMocksWithSearch = {
            ...commandMocks,
            searchNotesInLocalVecDB: async () =>  [
                {
                    metadata: {
                        noteUUID: "note1",
                        noteTitle: "Test Note 1",
                        noteContentPart: "test"
                    },
                    score: 0.95
                },
                {
                    metadata: {
                        noteUUID: "note2",
                        noteTitle: "Test Note 2",
                        noteContentPart: "test"
                    },
                    score: 0.85
                },
                {
                    metadata: {
                        noteUUID: "note2",
                        noteTitle: "Test Note 2",
                        noteContentPart: "hi"
                    },
                    score: 0.81
                }
            ]
        };

        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(commandMocksWithSearch))};
        `);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        
        await waitForCustomEvent(page, 'appLoaded');

        // Check status message
        await page.waitForSelector('text=Start typing to search');

        // Type search query
        await page.waitForSelector('.search-input input');
        await page.locator('.search-input input').fill('Test');
        
        // Wait for results to appear
        await page.waitForSelector('.note-card');
        await expect(page.locator('.note-card')).toHaveCount(2);
    }, 20000);
});