/**
 * @jest-environment node
 */
import html from "inline:../../embed/index.html";
import {chromium} from "playwright";

describe('mindmap embed', () => {
    it('should initialize markmap properly', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(html);
        await page.waitForSelector('.markmap-svg');
        await page.waitForFunction(() => {
            const svg = document.querySelector('.markmap-svg');
            return svg && svg.childNodes.length >= 2;
        });
        const svgText = await page.$eval('.markmap-svg', el => el.textContent);
        await browser.close();
    });
    it('should load toolbar items', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(html);
        await page.waitForSelector('.mm-toolbar-item');
        const toolbarItems = await page.$$('.mm-toolbar-item');
        expect(toolbarItems.length).toBeGreaterThan(1);
        await browser.close();
    });
});