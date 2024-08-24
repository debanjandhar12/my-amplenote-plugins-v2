import chartHTML from './embed/chart.html?inline';
import {TABLE_CHART_CONFIG_DIALOG} from "./constants.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import _ from "lodash";

const plugin = {
    insertText: {
        "Insert chart from table": async function (app) {
            try {
                // Prompt for chart data
                const dialog = TABLE_CHART_CONFIG_DIALOG;
                if (app.context.noteUUID)
                    dialog[1].inputs[1].value = app.context.noteUUID; // Set default note - doesn't work
                const promptResult = await app.prompt(...dialog);
                if (!promptResult) return;
                const [
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO,
                    CHART_ASPECT_RATIO_SIZE
                ] = promptResult;
                const chartData = {
                    DATA_SOURCE: 'note',
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    DATA_SOURCE_HEADER_FILTER: '',  // For future use
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO,
                    CHART_ASPECT_RATIO_SIZE
                };

                // Validate input
                if (!chartData.CHART_TYPE || !['bar', 'line', 'area', 'pie', 'doughnut', 'polarArea'].includes(chartData.CHART_TYPE)) {
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
                if (!chartData.CHART_ASPECT_RATIO_SIZE || isNaN(parseInt(chartData.CHART_ASPECT_RATIO_SIZE))) {
                    throw new Error('Chart size is required');
                }

                await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }?${encodeURIComponent(JSON.stringify(chartData))}" data-aspect-ratio="${chartData.CHART_ASPECT_RATIO_SIZE}" />`);

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
            return addWindowVariableToHtmlString(chartHTML, 'chartData', decodedChartData);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    async onEmbedCall(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);
        switch (commandName) {
            case 'getSettings':
                return { type: 'success', result: app.settings };
            case 'getAppProp':
                const propName = args[0];
                return { type: 'success', result: _.get(app, propName) };
            case 'saveFile':
                try {
                    let {name, data} = args[0];
                    if (data.startsWith('data:')) { // if data is url, convert to blob
                        const response = await fetch(data);
                        data = await response.blob();
                    }
                    const saved = await app.saveFile(data, name);
                    return { type: 'success', result: saved };
                } catch (e) {
                    return { type: 'error', result: e.message };
                }
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
