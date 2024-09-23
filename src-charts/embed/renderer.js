import {getMarkdownTableByIdx} from "../markdown/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../markdown/parseMarkdownTable.js";
import {getChartDataFrom2DArray} from "../chart/getChartDataFrom2DArray.js";
import Formula from "fparser";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

let chart;

export async function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    const getNoteDataSourceLabelsDataSetsObj = async () => {
        const noteContent = await appConnector.getNoteContentByUUID(window.chartData.DATA_SOURCE_NOTE_UUID);
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
        window.Chart = Chart;
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

export async function reloadChart() {
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