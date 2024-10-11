import {BaseChartData} from "./BaseChartData.js";
import {getMarkdownTableByIdx} from "../tables/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../tables/parseMarkdownTable.js";
import {getChartDataFromContingencyTable} from "../tables/getChartDataFromContingencyTable.js";
import {reloadChart} from "../embed/renderer.js";
import {getMarkdownTableCount} from "../tables/getMarkdownTableCount.jsx";
import {getChartDataFromSeriesTable, getVariablesFromSeriesTable} from "../tables/getChartDataFromSeriesTable.js";

export class TableChartData extends BaseChartData {
    constructor({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
                    TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,
                    TABLE_TYPE,
                    HORIZONTAL_AXIS_LABEL_DIRECTION, // For table type = 'contingency'
                    SERIES_X_AXIS_SELECTION_IDX, SERIES_Y_AXIS_SELECTION_IDX // For table type = 'series', stores column / row index of series axis
                }) {
        super({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE});
        this.CHART_TYPE = CHART_TYPE;
        this.DATA_SOURCE_NOTE_UUID = DATA_SOURCE_NOTE_UUID;
        this.TABLE_INDEX_IN_NOTE = TABLE_INDEX_IN_NOTE;
        this.START_FROM_ZERO = START_FROM_ZERO;
        this.CUMULATIVE = false;
        this.TABLE_TYPE = TABLE_TYPE;
        this.HORIZONTAL_AXIS_LABEL_DIRECTION = HORIZONTAL_AXIS_LABEL_DIRECTION || 'column';
        this.SERIES_X_AXIS_SELECTION_IDX = SERIES_X_AXIS_SELECTION_IDX || 0;
        this.SERIES_Y_AXIS_SELECTION_IDX = SERIES_Y_AXIS_SELECTION_IDX || 1;
        this.validate();
    }

    toJSON() {
        const { RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,  HORIZONTAL_AXIS_LABEL_DIRECTION, TABLE_TYPE,
            SERIES_X_AXIS_SELECTION_IDX, SERIES_Y_AXIS_SELECTION_IDX
            } = this;
        return { RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,  HORIZONTAL_AXIS_LABEL_DIRECTION, TABLE_TYPE,
            SERIES_X_AXIS_SELECTION_IDX, SERIES_Y_AXIS_SELECTION_IDX
            };
    }

    static supportedChartTypes = ['bar', 'line', 'area', 'pie', 'doughnut', 'polarArea'];
    validate() {
        super.validate();
        if (this.DATA_SOURCE !== 'note') {
            throw new Error('DATA_SOURCE is invalid');
        }
        if (!TableChartData.supportedChartTypes.includes(this.CHART_TYPE)) {
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
        if (typeof this.START_FROM_ZERO !== 'boolean') {
            throw new Error('START_FROM_ZERO must be a boolean');
        }
        if (!['contingency', 'series'].includes(this.TABLE_TYPE)) {
            throw new Error('TABLE_TYPE must be "contingency" or "series"');
        }
        if (this.TABLE_TYPE === 'contingency' && !['column', 'row'].includes(this.HORIZONTAL_AXIS_LABEL_DIRECTION)) {
            throw new Error('HORIZONTAL_AXIS_LABEL_DIRECTION must be "column" or "row"');
        }
        if (this.TABLE_TYPE === 'series' && typeof this.SERIES_X_AXIS_SELECTION_IDX !== 'number') {
            throw new Error('SERIES_X_AXIS must be a string containing series name');
        }
        if (this.TABLE_TYPE === 'series' && typeof this.SERIES_Y_AXIS_SELECTION_IDX !== 'number') {
            throw new Error('SERIES_Y_AXIS must be a string containing series name');
        }
    }

    /** --Chart related functionality-- */
     async _getChartDataSet() {
        const noteContent = await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID);
        const tableAtIndex = getMarkdownTableByIdx(noteContent, parseInt(this.TABLE_INDEX_IN_NOTE));
        if (!tableAtIndex) {
            throw new Error(`Table not found at index ${this.TABLE_INDEX_IN_NOTE} in note ${
                this.DATA_SOURCE_NOTE_UUID
            }`);
        }
        const table2DArray = parseMarkdownTable(tableAtIndex);
        if (this.TABLE_TYPE === 'contingency') {
            return getChartDataFromContingencyTable(table2DArray, this.HORIZONTAL_AXIS_LABEL_DIRECTION);
        } else if (this.TABLE_TYPE === 'series') {
            return  getChartDataFromSeriesTable(table2DArray, this.SERIES_X_AXIS_SELECTION_IDX, this.SERIES_Y_AXIS_SELECTION_IDX);
        }
    }

    async getChartJSParamObject() {
        const chartJSParamObj = await super.getChartJSParamObject();
        chartJSParamObj.type = this.CHART_TYPE;
        chartJSParamObj.data = await this._getChartDataSet();
        if (this.START_FROM_ZERO) {
            chartJSParamObj.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
        }
        if (this.CHART_TYPE === 'area') {
            // area is implemented as line with fill
            chartJSParamObj.data.datasets.forEach(dataset => {
                dataset.fill = true;
            });
            chartJSParamObj.type = 'line';
        }
        return chartJSParamObj;
    }

    /** -- Settings related functionality -- */
    async mountSettings() {
        await super.mountSettings();
        window.handleSettingChange = async () => {
            // Update chart data
            this.DATA_SOURCE_NOTE_UUID = document.getElementById('chart-settings-datasource-note-uuid').value;
            this.CHART_TITLE = document.getElementById('chart-settings-chart-title').value;
            this.TABLE_INDEX_IN_NOTE = parseInt(document.getElementById('chart-settings-datasource-table-index').value);
            this.START_FROM_ZERO = document.getElementById('chart-settings-start-from-zero').checked;
            this.CHART_TYPE = document.getElementById('chart-settings-chart-type').value;
            if (this.TABLE_TYPE === 'contingency') {
                this.HORIZONTAL_AXIS_LABEL_DIRECTION = document.getElementById('chart-settings-horizontal-axis-label-direction').value;
            } else if (this.TABLE_TYPE === 'series') {
                this.SERIES_X_AXIS_SELECTION_IDX = parseInt(document.getElementById('chart-settings-series-x-axis').value);
                this.SERIES_Y_AXIS_SELECTION_IDX = parseInt(document.getElementById('chart-settings-series-y-axis').value);
            }
            this.TABLE_TYPE = document.getElementById('chart-settings-table-type').value;
            window.ChartData = this;
            await reloadChart();
            await this.mountSettings(); // Re-render settings
        }

        // Render settings based on Chart Data
        const settingContainerElement = document.getElementById('chart-settings-container');
        const allNotes = await appConnector.getAllNotes();
        const noteContent = await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID);
        const tableCount = Math.max(getMarkdownTableCount(noteContent), 1);
        const variables = this.TABLE_TYPE === 'series' ? getVariablesFromSeriesTable(parseMarkdownTable(noteContent)) : [];
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
            <!-- column 1: for source data and chart type -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-chart-type">Chart Type</label>
                    <select id="chart-settings-chart-type" name="chart-settings-chart-type" onchange="handleSettingChange()">
                    ${TableChartData.supportedChartTypes.map(chartType => `<option value="${chartType}">${chartType}</option>`).join('')}
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-datasource-note-uuid">Note</label>
                    <select id="chart-settings-datasource-note-uuid" name="chart-settings-datasource-note-uuid" onchange="handleSettingChange()">
                        ${
                            allNotes.map(note => `<option value="${note.uuid}">${note.name}</option>`).join('')
                         }
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-datasource-table-index">Select Table</label>
                    <select id="chart-settings-datasource-table-index" name="chart-settings-datasource-table-index" onchange="handleSettingChange()">
                        ${(new Array(tableCount)).fill(0).map((_, i) => `<option value="${i}">Table ${i+1}</option>`).join('')}
                    </select>
                </div>
            </div>
            <!-- column 2: display settings -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-table-type">Table Type</label>
                    <select id="chart-settings-table-type" name="chart-settings-table-type" onchange="handleSettingChange()">
                        <option value="contingency">Contingency</option>
                        <option value="series">Series</option>
                    </select>
                </div>
                ${this.TABLE_TYPE === 'contingency' ? `
                <div class="setting-item">
                    <label for="chart-settings-horizontal-axis-label-direction">Horizontal (Category) Axis Label Direction</label>
                    <select id="chart-settings-horizontal-axis-label-direction" name="chart-settings-horizontal-axis-label-direction" onchange="handleSettingChange()">
                        <option value="column">Column</option>
                        <option value="row">Row</option>
                    </select>
                </div>` : ''}
                ${this.TABLE_TYPE === 'series' ? `
                <div class="setting-item">
                    <label for="chart-settings-series-x-axis">Series X Axis</label>
                    <select id="chart-settings-series-x-axis" name="chart-settings-series-x-axis" onchange="handleSettingChange()">
                        ${
                            variables.map((variable, i) => `<option value="${i}">${variable}</option>`).join('')
                         }
                    </select>
                    <label for="chart-settings-series-y-axis">Series Y Axis</label>
                    <select id="chart-settings-series-y-axis" name="chart-settings-series-y-axis" onchange="handleSettingChange()">
                        ${
                            variables.map((variable, i) => `<option value="${i}">${variable}</option>`).join('')
                         }
                    </select>
                </div>` : ''}
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
        console.log(html);
        settingContainerElement.innerHTML = html;
        document.getElementById('chart-settings-datasource-note-uuid').value = this.DATA_SOURCE_NOTE_UUID;
        document.getElementById('chart-settings-chart-title').value = this.CHART_TITLE;
        document.getElementById('chart-settings-start-from-zero').checked = this.START_FROM_ZERO;
        document.getElementById('chart-settings-datasource-table-index').value = this.TABLE_INDEX_IN_NOTE;
        document.getElementById('chart-settings-chart-type').value = this.CHART_TYPE;
        document.getElementById('chart-settings-table-type').value = this.TABLE_TYPE;
        if (this.TABLE_TYPE === 'contingency') {
            document.getElementById('chart-settings-horizontal-axis-label-direction').value = this.HORIZONTAL_AXIS_LABEL_DIRECTION;
        }
        else if (this.TABLE_TYPE === 'series') {
            document.getElementById('chart-settings-series-x-axis').value = this.SERIES_X_AXIS_SELECTION_IDX
            document.getElementById('chart-settings-series-y-axis').value = this.SERIES_Y_AXIS_SELECTION_IDX
        }
    }
}