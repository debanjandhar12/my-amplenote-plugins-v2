import { SAMPLE_MARKDOWN_DATA2 } from "../test/test-data.js";
import {getChartDataFrom2DArray} from "../chart/getChartDataFrom2DArray.js";
import {getMarkdownTableByIdx} from "../markdown/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../markdown/parseMarkdownTable.js";
import Chart from 'chart.js/auto';

if(!window.chartData && process.env.NODE_ENV === 'development') {
    window.chartData = {
        chartType: 'bar',
        dataSourceNote: 'mock-uuid',
        header: "Title for chart",
        tableIndex: 0,
        horizontalAxisLabels: 'column',
        startFromZero: true
    };
    window.callAmplenotePlugin = async function(command, ...args) {
        switch (command) {
            case 'getNoteContent':
                return `| | |
|-|-|
|Company A|Company B|
|1|2|`;
        }
    }
}

let chart;

async function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    try {
        const noteUUID = window.chartData.dataSourceNote;
        const noteContent = await window.callAmplenotePlugin('getNoteContent', noteUUID);
        console.log('noteContent', noteContent);
        const tableAtIndex = getMarkdownTableByIdx(noteContent, parseInt(window.chartData.tableIndex));
        if (!tableAtIndex) {
            throw new Error(`Table not found at index ${window.chartData.tableIndex} in note ${noteUUID}`);
        }
        console.log('tableAtIndex', tableAtIndex);
        const table2DArray = parseMarkdownTable(tableAtIndex);
        console.log('table2DArray', table2DArray);
        const chartDataFrom2DArray = getChartDataFrom2DArray(table2DArray, window.chartData.horizontalAxisLabels);
        console.log('chartDataFrom2DArray', chartDataFrom2DArray);
        const chartJSParamObj = {
            type: window.chartData.chartType,
            responsive: true,
            data: chartDataFrom2DArray,
        };
        chart = new Chart(ctx, chartJSParamObj);
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

async function addToolbar() {
    const style = document.createElement('style');
    style.textContent = `
    body {
        background-color: #192025;
        color: rgb(249, 251, 252);
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
    container.append(reloadToolbarItem);

    const settingsToolbarItem = document.createElement('div');
    settingsToolbarItem.title = 'Settings';
    settingsToolbarItem.className = 'toolbar-item';
    settingsToolbarItem.onclick = () => window.callAmplenotePlugin('alert', `
    Chart Type: ${window.chartData.chartType}
    Data Source: ${window.chartData.dataSourceNote}
    Header: ${window.chartData.header}
    Table Index: ${window.chartData.tableIndex}
    Horizontal Axis Labels: ${window.chartData.horizontalAxisLabels}
    Start From Zero: ${window.chartData.startFromZero}
    `);
    settingsToolbarItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="-2 -4 28 28" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
    container.append(settingsToolbarItem);
}

(async () => {
    if (!window.appSettings) window.appSettings = {};
    await initChart();
    await addToolbar();
})();
