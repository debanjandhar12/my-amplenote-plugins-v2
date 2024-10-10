import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {getChartJSParamObject} from "./util/getChartJSParamObj.js";

let chart;

export async function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    try {
        const chartDataSet = await window.ChartData.getChartDataSet();
        const Chart = (await dynamicImportESM("chart.js/auto")).default;
        window.Chart = Chart;
        chart = new Chart(ctx, getChartJSParamObject(chartDataSet));
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

window.reloadChart = reloadChart;