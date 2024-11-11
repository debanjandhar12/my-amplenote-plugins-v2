import {chromium} from "playwright";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMOJI_DATA_MOCK, EMBED_COMMANDS_MOCK} from "./emoji.testdata.js";
import html from "inline:../../embed/emoji.html";

describe('emoji embed', () => {
    it('should initialize emoji picker page properly', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_COMMANDS_MOCK))};
        window.INJECTED_EMOJI_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMOJI_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);

        // Wait for emoji picker page
        await page.waitForSelector('em-emoji-picker');

        // Wait for a second for it to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify custom emoji button is added
        await page.waitForSelector('#custom-emoji-insert');

        await browser.close();
    }, 20000);
    it('page navigation should work', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_COMMANDS_MOCK))};
        window.INJECTED_EMOJI_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMOJI_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);

        // Wait for emoji picker page
        await page.waitForSelector('em-emoji-picker');

        // Wait for a second for it to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify custom emoji button is added
        await page.waitForSelector('button[aria-label="😜"]');

        // Click button with aria-label="😜"
        await page.click('button[aria-label="😜"]');

        // Check availability of back button
        await page.waitForSelector('.emoji-size-page-back-button');

        // Click back button
        await page.click('.emoji-size-page-back-button');

        // Check if back to emoji picker page
        await page.waitForSelector('em-emoji-picker');

        // Wait for a second for it to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Click button with aria-label="😜"
        await page.waitForSelector('button[aria-label="😜"]');
        await page.click('button[aria-label="😜"]');

        // Check availability of submit button
        await page.waitForSelector('.emoji-size-page-submit-button');

        // Click submit button
        await page.click('.emoji-size-page-submit-button');

        // Check for Please close this window. message
        await page.waitForFunction(() => {
            return document.body.innerHTML.includes('Please close this window.');
        });

        await browser.close();
    }, 20000);
});