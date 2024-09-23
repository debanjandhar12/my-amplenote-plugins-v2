import {chromium} from "playwright";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {CHART_DATA_MOCK, CHART_FORMULA_DATA_MOCK, EMBED_COMMANDS_MOCK} from "./chart.testdata.js";
import html from "inline:../../embed/chart.html";

describe('chart embed', () => {
    it('should initialize (table data source)', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_COMMANDS_MOCK))};
        window.INJECTED_CHART_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(CHART_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('#chart');
        const canvas = await page.$('#chart');
        const chartData = await page.waitForFunction(() => {
            const canvas = document.querySelector('#chart');
            if(!window.Chart || !Chart.getChart(canvas)) return false;
            return (window.Chart.getChart(canvas)).data.datasets;
        });
        expect(canvas).not.toBeNull();
        expect((await chartData.jsonValue()).length).toBeGreaterThan(0);
        await browser.close();
    }, 10000);

    it('should initialize (formula data source)', async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_COMMANDS_MOCK))};
        window.INJECTED_CHART_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(CHART_FORMULA_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);
        await page.waitForSelector('#chart');
        const canvas = await page.$('#chart');
        const chartData = await page.waitForFunction(() => {
            const canvas = document.querySelector('#chart');
            if(!window.Chart || !Chart.getChart(canvas)) return false;
            return (window.Chart.getChart(canvas)).data.datasets;
        });
        expect(canvas).not.toBeNull();
        expect((await chartData.jsonValue()).length).toBeGreaterThan(0);
        await browser.close();
    }, 10000);
});