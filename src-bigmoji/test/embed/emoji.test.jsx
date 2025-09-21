import { compileJavascriptCode } from "../../../common-utils/esbuild-test-helpers.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {createCallAmplenotePluginMock} from "../../../common-utils/embed-comunication.js";
import {EMOJI_DATA_MOCK, EMBED_COMMANDS_MOCK} from "./emoji.testdata.js";
import html from "inline:../../embed/emoji.html";
import {
    createPlaywrightHooks, 
    takeScreenshot
} from "../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('emoji embed', () => {
    const { getPage } = createPlaywrightHooks(false);
    beforeEach(() => {
        allure.epic('src-bigmoji');
    });

    it('should initialize emoji picker page properly', async () => {
        allure.description('Tests initialization of emoji picker page with proper setup and custom emoji button');
        
        const mockCode = /* javascript */ `
            import { EMOJI_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-bigmoji/test/embed/emoji.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.emojiData = EMOJI_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();

        await allure.step('Setup and load emoji embed page', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Emoji embed page loaded');
        });

        await allure.step('Wait for emoji picker to initialize', async () => {
            await page.waitForSelector('em-emoji-picker');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, 'Emoji picker initialized');
        });

        await allure.step('Verify custom emoji insert button is present', async () => {
            await page.waitForSelector('#custom-emoji-insert');
            await takeScreenshot(page, 'Custom emoji insert button visible');
        });

    }, 20000);
    
    it('page navigation should work', async () => {
        allure.description('Tests page navigation functionality including emoji selection, back button, and submit functionality');
        
        const mockCode = /* javascript */ `
            import { EMOJI_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-bigmoji/test/embed/emoji.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.emojiData = EMOJI_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();

        await allure.step('Setup and load emoji embed page', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Emoji embed page loaded for navigation test');
        });

        await allure.step('Wait for emoji picker to initialize and locate target emoji', async () => {
            await page.waitForSelector('em-emoji-picker');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.waitForSelector('button[aria-label="😜"]');
            await takeScreenshot(page, 'Emoji picker ready with target emoji visible');
        });

        await allure.step('Click emoji and verify navigation to size page', async () => {
            await page.click('button[aria-label="😜"]');
            await page.waitForSelector('.emoji-size-page-back-button');
            await takeScreenshot(page, 'Navigated to emoji size page');
        });

        await allure.step('Test back button navigation', async () => {
            await page.click('.emoji-size-page-back-button');
            await page.waitForSelector('em-emoji-picker');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, 'Back to emoji picker page');
        });

        await allure.step('Navigate to size page again and submit', async () => {
            await page.waitForSelector('button[aria-label="😜"]');
            await page.click('button[aria-label="😜"]');
            await page.waitForSelector('.emoji-size-page-submit-button');
            await takeScreenshot(page, 'Ready to submit emoji selection');
            
            await page.click('.emoji-size-page-submit-button');
        });

        await allure.step('Verify completion message is displayed', async () => {
            await page.waitForFunction(() => {
                return document.body.innerHTML.includes('Please close this window.');
            });
            await takeScreenshot(page, 'Completion message displayed');
        });

    }, 20000);
});