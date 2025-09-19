import html from "inline:../../embed/index.html";
import { compileJavascriptCode } from "../../../common-utils/esbuild-test-helpers.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {createCallAmplenotePluginMock} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK} from "./embed.testdata.js";
import {createPlaywrightHooks} from "../../../common-utils/playwright-helpers.ts";

describe('mindmap embed', () => {
    const { getPage } = createPlaywrightHooks(false);
    
    it('renders markmap', async () => {
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK } from './src-mindmap/test/embed/embed.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.noteUUID = EMBED_NOTE_UUID_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                "getNoteContentByUUID": async (noteUUID) => {
                    return "# Hello World"
                },
            });
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('.markmap-svg');
        await page.waitForFunction(() => {
            const svg = document.querySelector('.markmap-svg');
            return svg && svg.childNodes.length >= 2;
        });
        const svgText = await page.$eval('.markmap-svg', el => el.textContent);
        expect(svgText).toContain('Hello World');
    }, 20000);
    
    it('loads toolbar items', async () => {
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK } from './src-mindmap/test/embed/embed.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.noteUUID = EMBED_NOTE_UUID_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('.mm-toolbar-item');
        const toolbarItems = await page.$$('.mm-toolbar-item');
        expect(toolbarItems.length).toBeGreaterThan(1);
    }, 20000);
    
    it('handles error correctly', async () => {
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK } from './src-mindmap/test/embed/embed.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.noteUUID = EMBED_NOTE_UUID_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                "getNoteContentByUUID": async (noteUUID) => {
                    throw new Error("Note not found");
                },
            });
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);
        const content = await page.content();
        expect(content).toContain('Error: Note not found');
    }, 20000);
});