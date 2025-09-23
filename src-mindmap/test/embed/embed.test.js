import html from "inline:../../embed/index.html";
import { compileJavascriptCode } from "../../../common-utils/compileJavascriptCode.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {
    createPlaywrightHooks, 
    takeScreenshot
} from "../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('mindmap embed', () => {
    const { getPage } = createPlaywrightHooks(false);
    beforeEach(() => {
        allure.epic('src-mindmap');
    });

    it('renders markmap', async () => {
        allure.description('Tests mindmap rendering and SVG generation from note content');
        
        const mockCode = /* javascript */ `
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

        await allure.step('Setup and load mindmap embed', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Mindmap embed loaded');
        });

        await allure.step('Wait for markmap SVG to render', async () => {
            await page.waitForSelector('.markmap-svg');
            await takeScreenshot(page, 'Markmap SVG element rendered');
        });

        await allure.step('Verify SVG contains expected content', async () => {
            await page.waitForFunction(() => {
                const svg = document.querySelector('.markmap-svg');
                return svg && svg.childNodes.length >= 2;
            });
            const svgText = await page.$eval('.markmap-svg', el => el.textContent);
            expect(svgText).toContain('Hello World');
            await takeScreenshot(page, 'Markmap rendered with Hello World content');
        });
    }, 20000);
    
    it('loads toolbar items', async () => {
        allure.description('Tests loading and display of mindmap toolbar items');
        
        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, EMBED_NOTE_UUID_MOCK } from './src-mindmap/test/embed/embed.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.noteUUID = EMBED_NOTE_UUID_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();

        await allure.step('Setup and load mindmap embed', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Mindmap embed loaded for toolbar test');
        });

        await allure.step('Wait for toolbar items to load', async () => {
            await page.waitForSelector('.mm-toolbar-item');
            await takeScreenshot(page, 'Toolbar items loaded');
        });

        await allure.step('Verify multiple toolbar items are present', async () => {
            const toolbarItems = await page.$$('.mm-toolbar-item');
            expect(toolbarItems.length).toBeGreaterThan(1);
            await takeScreenshot(page, 'Multiple toolbar items verified');
        });
    }, 20000);
    
    it('handles error correctly', async () => {
        allure.description('Tests error handling when note content cannot be retrieved');
        
        const mockCode = /* javascript */ `
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

        await allure.step('Setup mindmap embed with error-throwing mock', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Mindmap embed loaded with error mock');
        });

        await allure.step('Verify error message is displayed', async () => {
            const content = await page.content();
            expect(content).toContain('Error: Note not found');
            await takeScreenshot(page, 'Error message displayed correctly');
        });
    }, 20000);
});