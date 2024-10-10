export function getChartJSParamObject(chartDataSetArray) {
    const chartJSParamObjOptions = {};
    if (window.ChartData.CHART_TITLE) {
        chartJSParamObjOptions.plugins = {
            title: {
                display: true,
                text: window.ChartData.CHART_TITLE
            }
        };
    }
    if (window.ChartData.START_FROM_ZERO) {
        chartJSParamObjOptions.scales = {
            y: {
                beginAtZero: true
            }
        };
    }
    if (window.ChartData.CHART_TYPE === 'area') {
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
        type: window.ChartData.CHART_TYPE !== 'area' ? window.ChartData.CHART_TYPE : 'line', // area is implemented as line with fill
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.ChartData.CHART_ASPECT_RATIO_SIZE,
        data: chartDataSetArray,
        options: chartJSParamObjOptions,
        plugins: [customCanvasBackgroundColorPlugin]
    };
    return chartJSParamObj;
}