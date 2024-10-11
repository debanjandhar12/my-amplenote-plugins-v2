import chartHTML from 'inline:./embed/chart.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {ChartDataFactory} from "./chart/ChartDataFactory.js";

const plugin = {
    insertText: {
        "Create from table": async function (app) {
            try {
                const chartSize = await app.prompt("Chart Size:", {
                    inputs: [
                        { label: "", type: "select", options: [
                            { label: "Small", value: 3 },
                            { label: "Medium", value: 2 },
                            { label: "Large", value: 1 }
                        ], value: 2 }
                    ]
                });
                const ChartData = ChartDataFactory.parseChartDataFromDataSource({
                    RANDOM_UUID: Math.random().toString(36).substring(7),
                    DATA_SOURCE: 'note',
                    CHART_TYPE: 'bar',
                    DATA_SOURCE_NOTE_UUID: app.context.noteUUID,
                    CHART_TITLE: '',
                    TABLE_INDEX_IN_NOTE: 0,
                    TABLE_TYPE: 'contingency',
                    HORIZONTAL_AXIS_LABEL_DIRECTION: 'column',
                    START_FROM_ZERO: false,
                    CHART_ASPECT_RATIO_SIZE: chartSize
                });
                await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }?${encodeURIComponent(JSON.stringify(ChartData.toJSON()))}" data-aspect-ratio="${ChartData.CHART_ASPECT_RATIO_SIZE}" />`);
                return null;
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Create from formula": async function (app) {
            try {
                const chartSize = await app.prompt("Chart Size:", {
                    inputs: [
                        { label: "", type: "select", options: [
                                { label: "Small", value: 3 },
                                { label: "Medium", value: 2 },
                                { label: "Large", value: 1 }
                            ], value: "medium" }
                    ]
                });
                const chartData = ChartDataFactory.parseChartDataFromDataSource({
                    RANDOM_UUID: Math.random().toString(36).substring(7),
                    DATA_SOURCE: 'formula',
                    CHART_TYPE: 'line',
                    CHART_TITLE: '',
                    DATA_SOURCE_FORMULA_F: '2x + 1',
                    MIN_X: '1',
                    MAX_X: '20',
                    STEP_X: '1',
                    START_FROM_ZERO: false,
                    CHART_ASPECT_RATIO_SIZE: chartSize
                });
                await app.context.replaceSelection(`<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartData.toJSON()))}" data-aspect-ratio="${chartData.CHART_ASPECT_RATIO_SIZE}" />`);
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
            console.log('decodedChartData', decodedChartData);
            return addWindowVariableToHtmlString(chartHTML, 'ChartData', decodedChartData);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        getAllNotes: async (app) => {
            try {
                const allNotes = await app.filterNotes({});
                return allNotes;
            } catch (e) {
                throw 'Failed getAllNotes - ' + e;
            }
        },
        updateChartData: async (app, chartDataOld, chartDataNew) => { // Note: toJSON() already called on chartDataOld and chartDataNew
            try {
                console.log('ok', chartDataOld, chartDataNew);
                const originalNoteContent = await app.getNoteContent({uuid: app.context.noteUUID});
                const originalEmbedTag = `<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartDataOld))}" data-aspect-ratio="${chartDataOld.CHART_ASPECT_RATIO_SIZE}" />`;
                console.log('originalEmbedTag', originalEmbedTag, 'originalNoteContent', originalNoteContent);
                if (!originalNoteContent.includes(originalEmbedTag)) {
                    throw new Error('Original chart not found in note');
                }
                const newEmbedTag = `<object data="plugin://${app.context.pluginUUID}?${encodeURIComponent(JSON.stringify(chartDataNew))}" data-aspect-ratio="${chartDataNew.CHART_ASPECT_RATIO_SIZE}" />`;
                const newNoteContent = originalNoteContent.replace(originalEmbedTag, newEmbedTag);
                await app.replaceNoteContent({uuid: app.context.noteUUID}, newNoteContent);
            } catch (e) {
                console.error(e);
                await app.alert(e);
                throw e;
            }
        }
    }),
}

export default plugin;
