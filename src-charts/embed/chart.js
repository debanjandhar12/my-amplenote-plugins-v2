import {SAMPLE_MARKDOWN_DATA, SAMPLE_MARKDOWN_DATA2} from "../test/test-data.js";
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
        horizontalAxisLabels: 'first column',
        startFromZero: true
    };
    window.callAmplenotePlugin = async function(command, ...args) {
        switch (command) {
            case 'getNoteContent':
                return SAMPLE_MARKDOWN_DATA2;
        }
    }
}

async function init() {
    const noteUUID = window.chartData.dataSourceNote;
    const noteContent = await window.callAmplenotePlugin('getNoteContent', noteUUID);
    const tableAtIndex = getMarkdownTableByIdx(noteContent, window.chartData.tableIndex);
    const table2DArray = parseMarkdownTable(tableAtIndex);
    console.log(getChartDataFrom2DArray(table2DArray));
    const chartJSParamObj = {
        type: window.chartData.chartType,
        data: getChartDataFrom2DArray(table2DArray)
    };
    const ctx = document.getElementById('chart').getContext('2d');
    const chart = new Chart(ctx, chartJSParamObj);
}

(async () => {
    if (!window.appSettings) window.appSettings = {};
    window.dispatchEvent(new Event('resize'));
    await init();
})();

// Resize iframe height to fit content handler
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    body.style.height = (iframeHeight-24) + 'px';
});