import {BaseChartData} from "./BaseChartData.js";
import {getMarkdownTableByIdx} from "../tables/getMarkdownTableByIdx.js";
import {parseMarkdownTable} from "../tables/parseMarkdownTable.js";
import {reloadChart} from "../embed/renderer.js";
import {getMarkdownTableCount} from "../tables/getMarkdownTableCount.jsx";
import {getChartDataFromTable, getSeriesVariablesFromTable} from "../tables/getChartDataFromTable.js";

export class TableChartData extends BaseChartData {
    constructor({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
                    TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,
                    SERIES_ORIENTATION, CATEGORY_VARIABLE_INDEX, SERIES_VARIABLE_INDEXES,
                }) {
        super({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE});
        this.CHART_TYPE = CHART_TYPE;
        this.DATA_SOURCE_NOTE_UUID = DATA_SOURCE_NOTE_UUID;
        this.TABLE_INDEX_IN_NOTE = TABLE_INDEX_IN_NOTE;
        this.START_FROM_ZERO = START_FROM_ZERO;
        this.CUMULATIVE = false;
        this.SERIES_ORIENTATION = SERIES_ORIENTATION;
        this.CATEGORY_VARIABLE_INDEX = CATEGORY_VARIABLE_INDEX;
        this.SERIES_VARIABLE_INDEXES = SERIES_VARIABLE_INDEXES;
        this.validate();
    }

    async initSeriesVariableIndexesIfNull() {
        if (this.SERIES_VARIABLE_INDEXES == null) {
            this.SERIES_VARIABLE_INDEXES = [];
            try {
                    const noteContent = await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID);
                    const tableMarkdown = getMarkdownTableByIdx(noteContent, parseInt(this.TABLE_INDEX_IN_NOTE)) || '';
                    const table2DArray = parseMarkdownTable(tableMarkdown);
                    this.SERIES_VARIABLE_INDEXES = table2DArray[0].map((_, i) => i).filter(i => i !== this.CATEGORY_VARIABLE_INDEX);
                    console.log('inited', this.SERIES_VARIABLE_INDEXES);
            } catch (e) {}
        }
    }

    toJSON() {
        const { RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,
            SERIES_ORIENTATION, CATEGORY_VARIABLE_INDEX, SERIES_VARIABLE_INDEXES
            } = this;
        return { RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_NOTE_UUID,
            TABLE_INDEX_IN_NOTE,  START_FROM_ZERO, CUMULATIVE,
            SERIES_ORIENTATION, CATEGORY_VARIABLE_INDEX, SERIES_VARIABLE_INDEXES
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
        if (!['horizontal', 'vertical'].includes(this.SERIES_ORIENTATION)) {
            throw new Error('SERIES_ORIENTATION must be "horizontal" or "vertical"');
        }
        if (isNaN(this.CATEGORY_VARIABLE_INDEX) || !Number.isInteger(this.CATEGORY_VARIABLE_INDEX) || this.CATEGORY_VARIABLE_INDEX < 0) {
            throw new Error('CATEGORY_VARIABLE_INDEX must be a non-negative integer');
        }
        if (!Array.isArray(this.SERIES_VARIABLE_INDEXES) && this.SERIES_VARIABLE_INDEXES != null) {
            throw new Error('SERIES_VARIABLE_INDEXES must be an array');
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
        await this.initSeriesVariableIndexesIfNull();
        return getChartDataFromTable(table2DArray, this.SERIES_ORIENTATION, this.CATEGORY_VARIABLE_INDEX, this.SERIES_VARIABLE_INDEXES);
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
            this.TABLE_INDEX_IN_NOTE = parseInt(document.getElementById('chart-settings-datasource-table-index').value);
            this.CHART_TYPE = document.getElementById('chart-settings-chart-type').value;
            this.CHART_TITLE = document.getElementById('chart-settings-chart-title').value;
            this.START_FROM_ZERO = document.getElementById('chart-settings-start-from-zero').checked;
            this.SERIES_ORIENTATION = document.getElementById('chart-settings-series-orientation').value;
            this.CATEGORY_VARIABLE_INDEX = parseInt(document.getElementById('chart-settings-category-variable-index').value);
            this.SERIES_VARIABLE_INDEXES = [];
            const seriesVariableIndexCheckboxes = document.querySelectorAll('#chart-settings-series-variable-indexes input[type="checkbox"]');
            for (let i = 0; i < seriesVariableIndexCheckboxes.length; i++) {
                if (seriesVariableIndexCheckboxes[i].checked &&
                    this.CATEGORY_VARIABLE_INDEX !== i) {
                    this.SERIES_VARIABLE_INDEXES.push(i);
                }
            }
            window.scrollPosSettingSeriesVariableIndexes = document.getElementById('chart-settings-series-variable-indexes').scrollTop;
            window.ChartData = this;
            await reloadChart();
            await this.mountSettings(); // Re-render settings
        }

        // Render settings based on Chart Data
        await this.initSeriesVariableIndexesIfNull();
        const settingContainerElement = document.getElementById('chart-settings-container');
        const allNotes = await appConnector.getAllNotes();
        const noteContent = await appConnector.getNoteContentByUUID(this.DATA_SOURCE_NOTE_UUID);
        const tableCount = Math.max(getMarkdownTableCount(noteContent), 1);
        const tableMarkdown = getMarkdownTableByIdx(noteContent, parseInt(this.TABLE_INDEX_IN_NOTE)) || '';
        let variables = getSeriesVariablesFromTable(parseMarkdownTable(tableMarkdown), this.SERIES_ORIENTATION);
        window.scrollPosSettingSeriesVariableIndexes = window.scrollPosSettingSeriesVariableIndexes == null ? 20
            : window.scrollPosSettingSeriesVariableIndexes;
        const html = `
        <style>
        .setting-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 0.9em;
        }
        .setting-main-container {
            display: flex; 
            flex-direction: row; 
            justify-content: space-evenly; 
            align-items: center;
            font-size: 0.8em;
        }
        </style>
        <div class="setting-main-container">
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
                    <select id="chart-settings-datasource-note-uuid" name="chart-settings-datasource-note-uuid" onchange="handleSettingChange()"  style="max-width: 180px;" >
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
                <div class="setting-item">
                    <label for="chart-settings-chart-title">Chart Title</label>
                    <input type="text" id="chart-settings-chart-title" name="chart-settings-chart-title" value="${this.CHART_TITLE}" onchange="handleSettingChange()">
                </div>
            </div>
            <!-- column 2: display settings -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-series-orientation">Series Orientation</label>
                    <select id="chart-settings-series-orientation" name="chart-settings-series-orientation" onchange="handleSettingChange()">
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-category-variable-index">Category Variables ${this.SERIES_ORIENTATION === 'horizontal' ? 'Column' : 'Row'}</label>
                    <select id="chart-settings-category-variable-index" name="chart-settings-category-variable-index" onchange="handleSettingChange()"  style="max-width: 180px;">
                        ${
                            variables.map((variable, i) => `<option value="${i}">${
                                variable.trim() === '' ? `${this.SERIES_ORIENTATION === 'horizontal' ? 'Column' : 'Row'} ${i + 1}` : variable
                            }</option>`).join('')
                         }
                    </select>
                </div>
                <div class="setting-item" style="min-width: 160px; max-height: 70px; display: flex">
                    <label for="chart-settings-series-variable-indexes">Series</label>
                    <div id="chart-settings-series-variable-indexes" style="overflow-x: hidden; overflow-y: scroll; background-color: rgba(0,0,0,0.1);width: 100%;">
                        ${
                            variables.map((variable, i) =>
                            `<div class="${this.CATEGORY_VARIABLE_INDEX === i ? 'hidden' : ''}"><input type="checkbox" id="chart-settings-series-variable-index-${i}" name="chart-settings-series-variable-index-${i}" value="${i}" ${this.SERIES_VARIABLE_INDEXES.includes(i) ? 'checked' : ''} onchange="handleSettingChange()"><label for="chart-settings-series-variable-index-${i}">${
                                variable.trim() === '' ? `${this.SERIES_ORIENTATION === 'horizontal' ? 'Column' : 'Row'} ${i + 1}` : variable
                            }</label></div>`).join('')
                         }
                    </div>
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
        document.getElementById('chart-settings-start-from-zero').checked = this.START_FROM_ZERO;
        document.getElementById('chart-settings-datasource-table-index').value = this.TABLE_INDEX_IN_NOTE;
        document.getElementById('chart-settings-chart-type').value = this.CHART_TYPE;
        document.getElementById('chart-settings-series-orientation').value = this.SERIES_ORIENTATION;
        document.getElementById('chart-settings-category-variable-index').value = this.CATEGORY_VARIABLE_INDEX;
        const seriesVariableIndexCheckboxes = document.querySelectorAll('#chart-settings-series-variable-indexes input[type="checkbox"]');
        for (let i = 0; i < seriesVariableIndexCheckboxes.length; i++) {
            seriesVariableIndexCheckboxes[i].checked = this.SERIES_VARIABLE_INDEXES.includes(i);
            if (this.CATEGORY_VARIABLE_INDEX === i) {
                seriesVariableIndexCheckboxes[i].disabled = true;
            }
        }
        document.getElementById('chart-settings-series-variable-indexes').scrollTop = window.scrollPosSettingSeriesVariableIndexes;
    }
}