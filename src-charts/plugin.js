import chartHTML from 'inline:./embed/chart.html';
import {
    FORMULA_CHART_CONFIG_DIALOG,
    formulaChartSchema,
    noteChartSchema,
    TABLE_CHART_CONFIG_DIALOG
} from "./constants.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {cloneDeep} from "lodash-es";
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";

const plugin = {
    insertText: {
        "Create from table": async function (app) {
            try {
                const dialog = cloneDeep(TABLE_CHART_CONFIG_DIALOG);
                if (app.context.noteUUID)
                    dialog[1].inputs[1].value = app.context.noteUUID; // Set default note - doesn't work
                const promptResult = await app.prompt(...dialog);
                if (!promptResult) return;
                let [
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO,
                    CHART_ASPECT_RATIO_SIZE
                ] = promptResult;
                if (DATA_SOURCE_NOTE_UUID && DATA_SOURCE_NOTE_UUID.uuid) {
                    DATA_SOURCE_NOTE_UUID = DATA_SOURCE_NOTE_UUID.uuid;
                }
                const chartData = {
                    RANDOM_UUID: Math.random().toString(36).substring(7),
                    RENDERING_NOTE_UUID: app.context.noteUUID,
                    DATA_SOURCE: 'note',
                    CHART_TYPE,
                    DATA_SOURCE_NOTE_UUID,
                    DATA_SOURCE_HEADER_FILTER: '',  // For future use
                    CUMULATIVE: false,  // For future use
                    CHART_TITLE,
                    TABLE_INDEX_IN_NOTE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION,
                    START_FROM_ZERO,
                    CHART_ASPECT_RATIO_SIZE
                };
                await plugin._validateChartConfig(chartData);
                await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }?${encodeURIComponent(JSON.stringify(chartData))}" data-aspect-ratio="${chartData.CHART_ASPECT_RATIO_SIZE}" />`);
                return null;
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Create from formula": async function (app) {
            try {
                const dialog = cloneDeep(FORMULA_CHART_CONFIG_DIALOG);
                const promptResult = await app.prompt(...dialog);
                if (!promptResult) return;
                let [
                    CHART_TYPE,
                    CHART_TITLE,
                    DATA_SOURCE_FORMULA_F,
                    MIN_X,
                    MAX_X,
                    STEP_X,
                    CHART_ASPECT_RATIO_SIZE
                ] = promptResult;
                const chartData = {
                    RANDOM_UUID: Math.random().toString(36).substring(7),
                    RENDERING_NOTE_UUID: app.context.noteUUID,
                    DATA_SOURCE: 'formula',
                    CHART_TYPE,
                    CHART_TITLE,
                    DATA_SOURCE_FORMULA_F,
                    DATA_SOURCE_FORMULA_G: '', // For future use
                    DATA_SOURCE_FORMULA_H: '', // For future use
                    MIN_X,
                    MAX_X,
                    STEP_X,
                    START_FROM_ZERO: false,  // For future use
                    CHART_ASPECT_RATIO_SIZE
                };
                await plugin._validateChartConfig(chartData);
                await app.context.replaceSelection(`<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartData))}" data-aspect-ratio="${chartData.CHART_ASPECT_RATIO_SIZE}" />`);
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
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        updateChartData: async (app, chartDataOld) => {
            try {
                let chartDataNew = {};
                if (chartDataOld.DATA_SOURCE === 'note') {
                    const dialog = cloneDeep(TABLE_CHART_CONFIG_DIALOG);
                    dialog[1].inputs[0].value = chartDataOld.CHART_TYPE;
                    dialog[1].inputs[1].value = chartDataOld.DATA_SOURCE_NOTE_UUID;
                    dialog[1].inputs[1].type = 'text';
                    dialog[1].inputs[2].value = chartDataOld.CHART_TITLE;
                    dialog[1].inputs[3].value = chartDataOld.TABLE_INDEX_IN_NOTE;
                    dialog[1].inputs[4].value = chartDataOld.HORIZONTAL_AXIS_LABEL_DIRECTION;
                    dialog[1].inputs[5].value = chartDataOld.START_FROM_ZERO;
                    dialog[1].inputs[6].value = chartDataOld.CHART_ASPECT_RATIO_SIZE;
                    const promptResult = await app.prompt(...dialog);
                    if (!promptResult) return;
                    let [
                        CHART_TYPE,
                        DATA_SOURCE_NOTE_UUID,
                        CHART_TITLE,
                        TABLE_INDEX_IN_NOTE,
                        HORIZONTAL_AXIS_LABEL_DIRECTION,
                        START_FROM_ZERO,
                        CHART_ASPECT_RATIO_SIZE
                    ] = promptResult;
                    if (DATA_SOURCE_NOTE_UUID) {
                        DATA_SOURCE_NOTE_UUID = await app.findNote({uuid: DATA_SOURCE_NOTE_UUID});
                        DATA_SOURCE_NOTE_UUID = DATA_SOURCE_NOTE_UUID.uuid;
                    }
                    chartDataNew = {
                        ...chartDataOld,
                        CHART_TYPE,
                        DATA_SOURCE_NOTE_UUID,
                        CHART_TITLE,
                        TABLE_INDEX_IN_NOTE,
                        HORIZONTAL_AXIS_LABEL_DIRECTION,
                        START_FROM_ZERO,
                        CHART_ASPECT_RATIO_SIZE
                    };
                } else if (chartDataOld.DATA_SOURCE === 'formula') {
                    const dialog = cloneDeep(FORMULA_CHART_CONFIG_DIALOG);
                    dialog[1].inputs[0].value = chartDataOld.CHART_TYPE;
                    dialog[1].inputs[1].value = chartDataOld.CHART_TITLE;
                    dialog[1].inputs[2].value = chartDataOld.DATA_SOURCE_FORMULA_F;
                    dialog[1].inputs[3].value = chartDataOld.MIN_X;
                    dialog[1].inputs[4].value = chartDataOld.MAX_X;
                    dialog[1].inputs[5].value = chartDataOld.STEP_X;
                    dialog[1].inputs[6].value = chartDataOld.CHART_ASPECT_RATIO_SIZE;
                    const promptResult = await app.prompt(...dialog);
                    if (!promptResult) return;
                    let [
                        CHART_TYPE,
                        CHART_TITLE,
                        DATA_SOURCE_FORMULA_F,
                        MIN_X,
                        MAX_X,
                        STEP_X,
                        CHART_ASPECT_RATIO_SIZE
                    ] = promptResult;
                    chartDataNew = {
                        ...chartDataOld,
                        CHART_TYPE,
                        CHART_TITLE,
                        DATA_SOURCE_FORMULA_F,
                        MIN_X,
                        MAX_X,
                        STEP_X,
                        CHART_ASPECT_RATIO_SIZE
                    };
                }
                await plugin._validateChartConfig(chartDataNew);
                console.log('ok', chartDataNew);
                const originalNoteContent = await app.getNoteContent({uuid: chartDataOld.RENDERING_NOTE_UUID});
                const originalEmbedTag = `<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartDataOld))}" data-aspect-ratio="${chartDataOld.CHART_ASPECT_RATIO_SIZE}" />`;
                if (!originalNoteContent.includes(originalEmbedTag)) {
                    throw new Error('Original chart not found in note');
                }
                const newEmbedTag = `<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartDataNew))}" data-aspect-ratio="${chartDataNew.CHART_ASPECT_RATIO_SIZE}" />`;
                const newNoteContent = originalNoteContent.replace(originalEmbedTag, newEmbedTag);
                await app.replaceNoteContent({uuid: chartDataNew.RENDERING_NOTE_UUID}, newNoteContent);
                return chartDataNew;
            } catch (e) {
                console.error(e);
                await app.alert(e);
                throw e;
            }
        }
    }),
    async _validateChartConfig(chartData) {
        try {
            if (chartData.DATA_SOURCE === 'note') {
                noteChartSchema.parse(chartData);
            } else if (chartData.DATA_SOURCE === 'formula') {
                formulaChartSchema.parse(chartData);
            } else {
                throw new Error('Invalid data source');
            }
        } catch (e) {
            throw new Error(e.errors.map(err => err.message).join(', '));
        }
        return true;
    }
}

export default plugin;
