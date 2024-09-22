import { SAMPLE_MARKDOWN_DATA2 } from "../test/markdown/test-data.js";
import {getChartDataFrom2DArray} from "../chart/getChartDataFrom2DArray.js";
import {getMarkdownTableByIdx} from "../markdown/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../markdown/parseMarkdownTable.js";
import Formula from 'fparser';
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";

window.app = {};
if (process.env.NODE_ENV === 'development') {
    window.chartData = {
        DATA_SOURCE: 'note',
        CHART_TYPE: 'bar',
        DATA_SOURCE_NOTE_UUID: 'mock-uuid',
        DATA_SOURCE_HEADER_FILTER: '',
        CHART_TITLE: "Title for chart",
        TABLE_INDEX_IN_NOTE: 0,
        HORIZONTAL_AXIS_LABEL_DIRECTION: 'row',
        START_FROM_ZERO: true,
        CHART_ASPECT_RATIO_SIZE: '2'
    };
    window.app.getNoteContent = async function() {
        return `| | |
|-|-|
|Company A|Company B|
|1|2|`;
    };
    window.app.alert = window.alert;
    window.app.updateChartObject = async (chartData) => {};
}

window.app = new Proxy(window.app, {
    get: function(target, prop, receiver) {
        if (prop in target) {
            return target[prop];
        }
        return async function(...args) {
            const returnObj = await window.callAmplenotePlugin(prop, ...args);
            if (returnObj.type === 'success') {
                return returnObj.result;
            } else if (returnObj.type === 'error') {
                throw new Error(returnObj.result);
            }
        };
    }
});

let chart;

async function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    const getNoteDataSourceLabelsDataSetsObj = async () => {
        const noteContent = await window.app.getNoteContent({uuid: window.chartData.DATA_SOURCE_NOTE_UUID});
        console.log('noteContent', noteContent);
        const tableAtIndex = getMarkdownTableByIdx(noteContent, parseInt(window.chartData.TABLE_INDEX_IN_NOTE));
        if (!tableAtIndex) {
            throw new Error(`Table not found at index ${window.chartData.TABLE_INDEX_IN_NOTE} in note ${
                window.chartData.DATA_SOURCE_NOTE_UUID
            }`);
        }
        console.log('tableAtIndex', tableAtIndex);
        const table2DArray = parseMarkdownTable(tableAtIndex);
        console.log('table2DArray', table2DArray);
        const chartDataFrom2DArray = getChartDataFrom2DArray(table2DArray, window.chartData.HORIZONTAL_AXIS_LABEL_DIRECTION);
        console.log('chartDataFrom2DArray', chartDataFrom2DArray);
        return chartDataFrom2DArray;
    }
    const getFormulaDataSourceLabelsDataSetsObj = async () => {
        const labels = [];
        const datasets = [{
            label: 'f(x)',
            data: []
        }];
        const formula = new Formula(window.chartData.DATA_SOURCE_FORMULA_F);

        for (let x = parseFloat(window.chartData.MIN_X); x <= parseFloat(window.chartData.MAX_X); x += parseFloat(window.chartData.STEP_X)) {
            labels.push(x.toString());
            const y = await formula.evaluate({ x });
            datasets[0].data.push(y);
        }
        console.log('formula', labels, datasets);
        return { labels, datasets };
    }
    try {
        const chartDataSetArray = window.chartData.DATA_SOURCE === 'note' ? await
            getNoteDataSourceLabelsDataSetsObj() : await getFormulaDataSourceLabelsDataSetsObj();
        const Chart = (await dynamicImportESM("chart.js/auto")).default;
        chart = new Chart(ctx, getChartJSParamObject(chartDataSetArray));
    } catch (e) {
        const oldFillStyle = ctx.fillStyle;
        const oldFont = ctx.font;
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Error: "+e, 10, 50);
        ctx.font = oldFont;
        ctx.fillStyle = oldFillStyle;
        console.error(e);
    }
}

async function reloadChart() {
    chart.destroy();
    await initChart();
}

function getChartJSParamObject(chartDataSetArray) {
    const chartJSParamObjOptions = {};
    if (window.chartData.CHART_TITLE) {
        chartJSParamObjOptions.plugins = {
            title: {
                display: true,
                text: window.chartData.CHART_TITLE
            }
        };
    }
    if (window.chartData.START_FROM_ZERO) {
        chartJSParamObjOptions.scales = {
            y: {
                beginAtZero: true
            }
        };
    }
    if (window.chartData.CHART_TYPE === 'area') {
        chartDataSetArray.datasets.forEach(dataset => {
            dataset.fill = true;
        });
    }
    // Required to set background color of canvas on save as png image
    const customCanvasBackgroundColorPlugin = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const {ctx} = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#192025';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };
    const chartJSParamObj = {
        type: window.chartData.CHART_TYPE !== 'area' ? window.chartData.CHART_TYPE : 'line', // area is implemented as line with fill
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.chartData.CHART_ASPECT_RATIO_SIZE,
        data: chartDataSetArray,
        options: chartJSParamObjOptions,
        plugins: [customCanvasBackgroundColorPlugin]
    };
    return chartJSParamObj;
}

async function addToolbar() {
    const style = document.createElement('style');
    style.textContent = `
    body {
        background-color: #192025;
        color: rgb(249, 251, 252);
        height: 100vh;
        margin: 0;
    }
    .chart-container {
        position: relative;
        width: 100%;
        height: 100%;
        margin: 0px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .toolbar-brand {
        display: none;
    }
    .toolbar-item:hover {
        cursor: pointer;
        color: #007bff;
    }
    .toolbar-item svg {
        pointer-events: none;
    }
    `;
    document.head.append(style);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0.5rem';
    container.style.right = '0.5rem';
    document.body.append(container);

    const reloadToolbarItem = document.createElement('div');
    reloadToolbarItem.title = 'Reload Chart';
    reloadToolbarItem.className = 'toolbar-item';
    reloadToolbarItem.onclick = () => reloadChart();
    reloadToolbarItem.innerHTML = '<svg width="20" height="20" viewBox="0 0 768 1204"><path fill="currentColor" d="M655.461 473.469c11.875 81.719-13.062 167.781-76.812 230.594-94.188 92.938-239.5 104.375-346.375 34.562l74.875-73L31.96 627.25 70.367 896l84.031-80.5c150.907 111.25 364.938 100.75 502.063-34.562 79.5-78.438 115.75-182.562 111.25-285.312L655.461 473.469zM189.46 320.062c94.156-92.938 239.438-104.438 346.313-34.562l-75 72.969 275.188 38.406L697.586 128l-83.938 80.688C462.711 97.34400000000005 248.742 107.96900000000005 111.585 243.25 32.085 321.656-4.133 425.781 0.335 528.5l112.25 22.125C100.71 468.875 125.71 382.906 189.46 320.062z"/></svg>';
    if (window.chartData.DATA_SOURCE !== 'formula') {
        container.append(reloadToolbarItem);
    }

    const optionsToolbarItem = document.createElement('div');
    optionsToolbarItem.title = 'Options';
    optionsToolbarItem.className = 'toolbar-item';
    optionsToolbarItem.onclick = () => handleOptionsToolbarItem();
    optionsToolbarItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="-2 -4 28 28" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
    container.append(optionsToolbarItem);

    const settingsToolbarItem = document.createElement('div');
    settingsToolbarItem.title = 'Settings';
    settingsToolbarItem.className = 'toolbar-item';
    settingsToolbarItem.onclick = () => app.updateChartObject(window.chartData);
    settingsToolbarItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -6 28 28" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>';
    container.append(settingsToolbarItem);
}

async function handleOptionsToolbarItem() {
    const selection = await window.app.prompt("", {
        inputs: [
            { label: "Select an option", type: "select", options: [
                    { label: "Save as png image", value: "Save as png image" }
                ], value: "Save as png image"
            }
        ]
    });
    switch (selection) {
        case 'Save as png image':
            const canvas = document.getElementById('chart');
            const dataURL = canvas.toDataURL('image/png');
            await app.saveFile({data: dataURL, name: 'chart.png'});
            break;
    }
}

(async () => {
    if (!window.appSettings) window.appSettings = {};
    showEmbedLoader();
    await initChart();
    hideEmbedLoader();
    await addToolbar();
})();
