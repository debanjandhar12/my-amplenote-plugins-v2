import chartHTML from './embed/chart.html?inline';
import {TABLE_CHART_CONFIG_DIALOG} from "./constants.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import embedHTML from "../src-mindmap/embed/index.html";

const plugin = {
    insertText: {
        "Insert chart from table": async function (app) {
            try {
                let chartData = {dataSourceType: 'note-table'};

                // Prompt for chart data
                const promptResult = await app.prompt(...TABLE_CHART_CONFIG_DIALOG);
                if (!promptResult) return;
                const [
                    chartType,
                    dataSourceNote,
                    header,
                    tableIndex,
                    horizontalAxisLabels,
                    startFromZero
                ] = promptResult;
                chartData = {
                    ...chartData,
                    chartType,
                    dataSourceNote,
                    header,
                    tableIndex,
                    horizontalAxisLabels,
                    startFromZero
                };

                // Validate input
                if (!chartData.chartType || !['bar', 'line', 'pie', 'doughnut'].includes(chartData.chartType)) {
                    throw new Error('Chart type is required');
                }
                if (!chartData.dataSourceNote) {
                    throw new Error('Data Source is required');
                }
                if (chartData.dataSourceNote) {
                    chartData.dataSourceNote = chartData.dataSourceNote.uuid;
                    if (!chartData.dataSourceNote)
                        throw new Error('Data Source is required');
                }
                if (!chartData.tableIndex || isNaN(chartData.tableIndex)) {
                    throw new Error('TableIndex is required and must be a number');
                }
                if (!chartData.horizontalAxisLabels || !['first column', 'first row'].includes(chartData.horizontalAxisLabels)) {
                    throw new Error('Horizontal (category) axis labels is required');
                }

                // Return object tag
                return `<object data="plugin://${app.context.pluginUUID}?caller=object&chartdata=${encodeURIComponent(JSON.stringify(chartData))}" data-aspect-ratio="2" />`;
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed(app, ...args) {
        try {
            args = this._processEmbedArgs(args);
            const decodedChartData = JSON.parse(decodeURIComponent(args.chartData));
            const htmlWithChartData = addWindowVariableToHtmlString(chartHTML, 'chartData', decodedChartData);
            return addWindowVariableToHtmlString(htmlWithChartData, 'appSettings', app.settings);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    async onEmbedCall(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);
        switch (commandName) {
            case 'getNoteContent': {
                const [noteUUID] = args;
                return app.getNoteContent({uuid: noteUUID});
            }
            default:
                console.log('Unknown command: ' + commandName);
        }
    },
    // -- Utils --
    _processEmbedArgs(args) {
        if (args.length !== 1 || typeof args[0] !== 'string') {
            return args;
        }
        try {
            const params = new URLSearchParams(args[0]);
            const caller = params.get('caller');
            const chartData = params.get('chartdata');

            if (caller === 'object') {
                return {caller, chartData};
            } else {
                return args; // Handle peak viewer caller case
            }
        } catch (e) {
            return args; // Handle peak viewer caller case
        }
    }
}

export default plugin;
