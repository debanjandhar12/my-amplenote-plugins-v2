import {BaseChartData} from "./BaseChartData.js";
import {getMarkdownTableByIdx} from "../markdown/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../markdown/parseMarkdownTable.js";
import {getChartDataFrom2DArray} from "./util/getChartDataFrom2DArray.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {reloadChart} from "../embed/renderer.js";
import {getMarkdownTableCount} from "../markdown/getMarkdownTableCount.jsx";

export class TableChartData extends BaseChartData {
    constructor({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
                    TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION}) {
        super({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE});
        this.CHART_TYPE = CHART_TYPE;
        this.DATA_SOURCE_NOTE_UUID = DATA_SOURCE_NOTE_UUID;
        this.TABLE_INDEX_IN_NOTE = TABLE_INDEX_IN_NOTE;
        this.HORIZONTAL_AXIS_LABEL_DIRECTION = HORIZONTAL_AXIS_LABEL_DIRECTION;
        this.START_FROM_ZERO = START_FROM_ZERO;
        this.CUMULATIVE = false;
        this.validate();
    }

    toJSON() {
        const {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,  HORIZONTAL_AXIS_LABEL_DIRECTION
        } = this;
        return {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,  HORIZONTAL_AXIS_LABEL_DIRECTION
        };
    }

    validate() {
        super.validate();
        if (this.DATA_SOURCE !== 'note') {
            throw new Error('DATA_SOURCE is invalid');
        }
        if (!['bar', 'line', 'area', 'pie', 'doughnut', 'polarArea'].includes(this.CHART_TYPE)) {
            console.log(this);
            throw new Error('CHART_TYPE must be one of the valid chart types');
        }
        if (typeof this.DATA_SOURCE_NOTE_UUID !== 'string') {
            throw new Error('DATA_SOURCE_NOTE_UUID must be a string');
        }
        const parsedIndex = parseInt(this.TABLE_INDEX_IN_NOTE, 10);
        if (isNaN(parsedIndex) || !Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex > 100) {
            throw new Error('Table Index must be an integer between 0 and 100 (inclusive)');
        }
        if (this.HORIZONTAL_AXIS_LABEL_DIRECTION != null && !['column', 'row'].includes(this.HORIZONTAL_AXIS_LABEL_DIRECTION)) {
            throw new Error('HORIZONTAL_AXIS_LABEL_DIRECTION must be "column" or "row"');
        }
        if (typeof this.START_FROM_ZERO !== 'boolean') {
            throw new Error('START_FROM_ZERO must be a boolean');
        }
    }

    async getChartDataSet() {
        const noteContent = await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID);
        const tableAtIndex = getMarkdownTableByIdx(noteContent, parseInt(this.TABLE_INDEX_IN_NOTE));
        if (!tableAtIndex) {
            throw new Error(`Table not found at index ${this.TABLE_INDEX_IN_NOTE} in note ${
                this.DATA_SOURCE_NOTE_UUID
            }`);
        }
        console.log('tableAtIndex', tableAtIndex);
        const table2DArray = parseMarkdownTable(tableAtIndex);
        console.log('table2DArray', table2DArray);
        return getChartDataFrom2DArray(table2DArray, this.HORIZONTAL_AXIS_LABEL_DIRECTION);
    }

    /** -- Settings related functionality -- */
    async mountSettings() {
        await super.mountSettings();
        window.handleSettingChange = async () => {
            // Update chart data
            this.DATA_SOURCE_NOTE_UUID = document.getElementById('chart-settings-datasource-note-uuid').value;
            this.CHART_TITLE = document.getElementById('chart-settings-chart-title').value;
            this.HORIZONTAL_AXIS_LABEL_DIRECTION = document.getElementById('chart-settings-horizontal-axis-label-direction').value;
            this.TABLE_INDEX_IN_NOTE = parseInt(document.getElementById('chart-settings-datasource-table-index').value);
            this.START_FROM_ZERO = document.getElementById('chart-settings-start-from-zero').checked;
            window.ChartData = this;
            await reloadChart();
            await this.mountSettings(); // Re-render settings
        }

        // Render settings based on Chart Data
        const settingContainerElement = document.getElementById('chart-settings-container');
        const allNotes = await appConnector.getAllNotes();
        const tableCount = Math.max(getMarkdownTableCount(await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID)), 1);
        const html = `
        <style>
        .setting-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        </style>
        <div style="display: flex; flex-direction: row; justify-content: space-evenly; align-items: center;">
            <!-- column 1: for source data -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-datasource-note-uuid">Note</label>
                    <select id="chart-settings-datasource-note-uuid" name="chart-settings-datasource-note-uuid" onchange="handleSettingChange()">
                        ${
                            allNotes.map(note => `<option value="${note.uuid}">${note.name}</option>`).join('')
                         }
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-datasource-table-index">Table Index</label>
                    <select id="chart-settings-datasource-table-index" name="chart-settings-datasource-table-index" onchange="handleSettingChange()">
                        ${(new Array(tableCount)).fill(0).map((_, i) => `<option value="${i}">Table ${i+1}</option>`).join('')}
                    </select>
                </div>
            </div>
            <!-- column 2: display settings -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-horizontal-axis-label-direction">Horizontal Axis Label Direction</label>
                    <select id="chart-settings-horizontal-axis-label-direction" name="chart-settings-horizontal-axis-label-direction" onchange="handleSettingChange()">
                        <option value="column">Column</option>
                        <option value="row">Row</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-chart-title">Chart Title</label>
                    <input type="text" id="chart-settings-chart-title" name="chart-settings-chart-title" value="${this.CHART_TITLE}" onchange="handleSettingChange()">
                </div>
                <div class="setting-item">
                    <label for="chart-settings-start-from-zero">Start from Zero</label>
                    <input type="checkbox" id="chart-settings-start-from-zero" name="chart-settings-start-from-zero" onchange="handleSettingChange()">
                </div>
            </div>
        </div>
        `;
        settingContainerElement.innerHTML = html;
        document.getElementById('chart-settings-datasource-note-uuid').value = this.DATA_SOURCE_NOTE_UUID;
        document.getElementById('chart-settings-chart-title').value = this.CHART_TITLE;
        document.getElementById('chart-settings-horizontal-axis-label-direction').value = this.HORIZONTAL_AXIS_LABEL_DIRECTION;
        document.getElementById('chart-settings-start-from-zero').checked = this.START_FROM_ZERO;
        document.getElementById('chart-settings-datasource-table-index').value = this.TABLE_INDEX_IN_NOTE;
    }
}