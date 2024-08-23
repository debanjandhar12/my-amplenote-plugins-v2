import chartHTML from './embed/chart.html?inline';
import {TABLE_CHART_CONFIG_DIALOG} from "./constants.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import _ from "lodash";

const plugin = {
    insertText: {
        "Insert chart from table": async function (app) {
            try {
                // Prompt for chart data
                const promptResult = await app.prompt(...TABLE_CHART_CONFIG_DIALOG);
                if (!promptResult) return;
                const [
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO
                ] = promptResult;
                const chartData = {
                    DATA_SOURCE: 'note',
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO
                };

                // Validate input
                if (!chartData.CHART_TYPE || !['bar', 'line', 'pie', 'doughnut'].includes(chartData.CHART_TYPE)) {
                    throw new Error('Chart type is required');
                }
                if (!chartData.DATA_SOURCE_NOTE_UUID) {
                    throw new Error('Data Source is required');
                }
                if (chartData.DATA_SOURCE_NOTE_UUID) {
                    chartData.DATA_SOURCE_NOTE_UUID = chartData.DATA_SOURCE_NOTE_UUID.uuid;
                    if (!chartData.DATA_SOURCE_NOTE_UUID)
                        throw new Error('Data Source is required');
                }
                if (!chartData.TABLE_INDEX_IN_NOTE || isNaN(chartData.TABLE_INDEX_IN_NOTE)) {
                    throw new Error('TableIndex is required and must be a number');
                }
                if (!chartData.HORIZONTAL_AXIS_LABEL_DIRECTION || !['column', 'row'].includes(chartData.HORIZONTAL_AXIS_LABEL_DIRECTION)) {
                    throw new Error('Horizontal (category) axis labels is required');
                }

                await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }?${encodeURIComponent(JSON.stringify(chartData))}" data-aspect-ratio="2" />`);

                return null;
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed(app, args, source = 'embed') {
        try {
            const decodedChartData = JSON.parse(decodeURIComponent(args));
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
            case 'getSetting':
                return { type: 'success', result: app.setting };
            case 'getAppProp':
                const propName = args[0];
                return { type: 'success', result: _.get(app, propName) };
            default:
                try {
                    const result = await (_.get(app, commandName))(...args);
                    return { type: 'success', result: result };
                } catch (error) {
                    return { type: 'error', result: error.message };
                }
        }
    }
}

export default plugin;
