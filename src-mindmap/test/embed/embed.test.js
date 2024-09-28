import html from "inline:../../embed/index.html";
import {chromium} from "playwright";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK} from "./embed.testdata.js";

describe('mindmap embed', () => {
    it('renders markmap', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
            ...EMBED_COMMANDS_MOCK,
            "getNoteContentByUUID": async (noteUUID) => {
                return "# Hello World"
            },
        }))};
        window.INJECTED_NOTE_UUID_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_NOTE_UUID_MOCK))};
        `);
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('.markmap-svg');
        await page.waitForFunction(() => {
            const svg = document.querySelector('.markmap-svg');
            return svg && svg.childNodes.length >= 2;
        });
        const svgText = await page.$eval('.markmap-svg', el => el.textContent);
        expect(svgText).toContain('Hello World');
        await browser.close();
    }, 20000);
    it('loads toolbar items', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
            EMBED_COMMANDS_MOCK
        ))};
        window.INJECTED_NOTE_UUID_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_NOTE_UUID_MOCK))};
        `);
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('.mm-toolbar-item');
        const toolbarItems = await page.$$('.mm-toolbar-item');
        expect(toolbarItems.length).toBeGreaterThan(1);
        await browser.close();
    }, 20000);
    it('handles error correctly', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
            ...EMBED_COMMANDS_MOCK,
            "getNoteContentByUUID": async (noteUUID) => {
                throw new Error("Note not found");
            },
        }))};
        window.INJECTED_NOTE_UUID_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_NOTE_UUID_MOCK))};
        `);
        await page.setContent(htmlWithMocks);
        const content = await page.content();
        expect(content).toContain('Error: Note not found');
        await browser.close();
    }, 20000);
});