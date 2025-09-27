import { compileJavascriptCode } from "../../../common-utils/compileJavascriptCode.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {createCallAmplenotePluginMock} from "../../../common-utils/embed-comunication.js";
import {CHART_DATA_MOCK, CHART_FORMULA_DATA_MOCK, EMBED_COMMANDS_MOCK} from "./chart.testdata.js";
import html from "inline:../../embed/chart.html";
import {
    createPlaywrightHooks, 
    takeScreenshot
} from "../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('chart embed', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-charts');
    });

    it('should initialize (table data source)', async () => {
        allure.description('Tests chart initialization and rendering with table data source');
        
        const mockCode = /* javascript */ `
            import { CHART_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-charts/test/embed/chart.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.ChartData = CHART_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();

        await allure.step('Setup and load chart embed with table data source', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Chart embed loaded with table data source');
        });

        await allure.step('Wait for chart canvas to render', async () => {
            await page.waitForSelector('#chart');
            const canvas = await page.$('#chart');
            expect(canvas).not.toBeNull();
            await takeScreenshot(page, 'Chart canvas element rendered');
        });

        await allure.step('Verify chart data is populated and rendered', async () => {
            const chartData = await page.waitForFunction(() => {
                const canvas = document.querySelector('#chart');
                if(!window.Chart || !Chart.getChart(canvas)) return false;
                return (window.Chart.getChart(canvas)).data.datasets;
            });
            expect((await chartData.jsonValue()).length).toBeGreaterThan(0);
            await takeScreenshot(page, 'Chart successfully rendered with table data');
        });
    }, 20000);

    it('should initialize (formula data source)', async () => {
        allure.description('Tests chart initialization and rendering with formula data source');
        
        const mockCode = /* javascript */ `
            import { CHART_FORMULA_DATA_MOCK, EMBED_COMMANDS_MOCK } from './src-charts/test/embed/chart.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            window.ChartData = CHART_FORMULA_DATA_MOCK;
            window.callAmplenotePlugin = createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();

        await allure.step('Setup and load chart embed with formula data source', async () => {
            await page.setContent(htmlWithMocks);
            await takeScreenshot(page, 'Chart embed loaded with formula data source');
        });

        await allure.step('Wait for chart canvas to render', async () => {
            await page.waitForSelector('#chart');
            const canvas = await page.$('#chart');
            expect(canvas).not.toBeNull();
            await takeScreenshot(page, 'Chart canvas element rendered');
        });

        await allure.step('Verify chart data is populated and rendered', async () => {
            const chartData = await page.waitForFunction(() => {
                const canvas = document.querySelector('#chart');
                if(!window.Chart || !Chart.getChart(canvas)) return false;
                return (window.Chart.getChart(canvas)).data.datasets;
            });
            expect((await chartData.jsonValue()).length).toBeGreaterThan(0);
            await takeScreenshot(page, 'Chart successfully rendered with formula data');
        });
    }, 20000);
});