import { compileJavascriptCode } from "../../../common-utils/esbuild-test-helpers.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {createCallAmplenotePluginMock} from "../../../common-utils/embed-comunication.js";
import {CHART_DATA_MOCK, CHART_FORMULA_DATA_MOCK, EMBED_COMMANDS_MOCK} from "./chart.testdata.js";
import html from "inline:../../embed/chart.html";
import {createPlaywrightHooks} from "../../../common-utils/playwright-helpers.ts";

describe('chart embed', () => {
    const { getPage } = createPlaywrightHooks(false);
    
    it('should initialize (table data source)', async () => {
        const mockCode = `
            import { CHART_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-charts/test/embed/chart.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.ChartData = CHART_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
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
    }, 20000);

    it('should initialize (formula data source)', async () => {
        const mockCode = `
            import { CHART_FORMULA_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-charts/test/embed/chart.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.ChartData = CHART_FORMULA_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
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
    }, 20000);
});