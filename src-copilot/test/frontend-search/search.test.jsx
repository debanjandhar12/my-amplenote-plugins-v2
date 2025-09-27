import { compileJavascriptCode } from "../../../common-utils/compileJavascriptCode.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import html from "inline:../../embed/search.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";
import {EMBED_COMMANDS_MOCK} from "../frontend-chat/chat.testdata.js";
import { allure } from 'jest-allure2-reporter/api';

describe('search embed', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('loads correctly', async () => {
        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            const commandMocks = {...EMBED_COMMANDS_MOCK, getSettings: async () => ({}), getCopilotDBSyncState: async () => 'Fully Synced'};
            window.callAmplenotePlugin = createCallAmplenotePluginMock(commandMocks);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        
        await waitForCustomEvent(page, 'appLoaded');
        await expect(page.locator('.search-input')).toBeVisible();
    }, 20000);

    it('menu bar opens and closes', async () => {
        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            const commandMocks = {...EMBED_COMMANDS_MOCK, getSettings: async () => ({}), getCopilotDBSyncState: async () => 'Fully Synced'};
            window.callAmplenotePlugin = createCallAmplenotePluginMock(commandMocks);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await waitForCustomEvent(page, 'appLoaded');

        // Click menu button to open
        await page.waitForSelector('.search-menu-button');
        await page.locator('.search-menu-button').click();
        await expect(page.locator('.search-menu-content')).toBeVisible();
    }, 20000);

    it('search works with mocked results', async () => {
        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            const commandMocksWithSearch = {
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => ({}),
                getCopilotDBSyncState: async () => 'Fully Synced',
                searchNotesInCopilotDB: async () =>  [
                    {
                        noteUUID: "note1",
                        noteTitle: "Test Note 1",
                        actualNoteContentPart: "test",
                        noteTags: ["tag1"],
                        headingAnchor: null,
                        similarity: 0.95
                    },
                    {
                        noteUUID: "note2",
                        noteTitle: "Test Note 2",
                        actualNoteContentPart: "test",
                        noteTags: ["tag2"],
                        headingAnchor: null,
                        similarity: 0.85
                    },
                    {
                        noteUUID: "note2",
                        noteTitle: "Test Note 2",
                        actualNoteContentPart: "hi",
                        noteTags: ["tag2"],
                        headingAnchor: null,
                        similarity: 0.81
                    }
                ]
            };
            window.callAmplenotePlugin = createCallAmplenotePluginMock(commandMocksWithSearch);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
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