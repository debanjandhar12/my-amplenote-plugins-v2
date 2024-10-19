import {BaseChartData} from "./BaseChartData.js";
import Formula from "fparser";
import {ADDITIONAL_MATH_CONSTANTS} from "../constants.js";
import {truncate} from "lodash-es";

export class FormulaChartData extends BaseChartData {
    constructor({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_FORMULA_F, DATA_SOURCE_FORMULA_G, DATA_SOURCE_FORMULA_H, MIN_X, MAX_X, STEP_X, START_FROM_ZERO}) {
        super({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE});
        this.CHART_TYPE = CHART_TYPE;
        this.DATA_SOURCE_FORMULA_F = DATA_SOURCE_FORMULA_F;
        this.DATA_SOURCE_FORMULA_G = DATA_SOURCE_FORMULA_G;
        this.DATA_SOURCE_FORMULA_H = DATA_SOURCE_FORMULA_H;
        this.MIN_X = MIN_X;
        this.MAX_X = MAX_X;
        this.STEP_X = STEP_X;
        this.START_FROM_ZERO = START_FROM_ZERO;
        this.validate();
    }

    toJSON() {
        const {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_FORMULA_F, DATA_SOURCE_FORMULA_G, DATA_SOURCE_FORMULA_H, MIN_X, MAX_X, STEP_X, START_FROM_ZERO
        } = this;
        return {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE, CHART_TYPE, DATA_SOURCE_FORMULA_F, DATA_SOURCE_FORMULA_G, DATA_SOURCE_FORMULA_H, MIN_X, MAX_X, STEP_X, START_FROM_ZERO
        };
    }

    static supportedChartTypes = ['line', 'area'];
    validate() {
        super.validate();
        if (this.DATA_SOURCE !== 'formula') {
            throw new Error('DATA_SOURCE is invalid');
        }
        if (!FormulaChartData.supportedChartTypes.includes(this.CHART_TYPE)) {
            throw new Error('CHART_TYPE must be one of the valid formula chart types');
        }
        try {
            const fObj = new Formula(this.DATA_SOURCE_FORMULA_F);
            fObj.evaluate({ x: 1, ...ADDITIONAL_MATH_CONSTANTS });
        } catch {
            throw new Error('Invalid formula');
        }
        if (isNaN(this.MIN_X) || isNaN(parseFloat(this.MIN_X))) {
            throw new Error('minX must be a number');
        }
        if (isNaN(this.MAX_X) || isNaN(parseFloat(this.MAX_X))) {
            throw new Error('maxX must be a number');
        }
        if (isNaN(this.STEP_X) || isNaN(parseFloat(this.STEP_X))) {
            throw new Error('stepX must be a number');
        }
        if (typeof this.START_FROM_ZERO !== 'boolean') {
            throw new Error('START_FROM_ZERO must be a boolean');
        }
    }

    /** --Chart related functionality-- */
    async _getChartDataSet() {
        const labels = [];
        const datasets = [{
            label: 'f(x) = ' + truncate(this.DATA_SOURCE_FORMULA_F.trim().replaceAll('\n', ' '), {length: 10}),
            data: []
        }];
        const formula = new Formula(this.DATA_SOURCE_FORMULA_F);

        for (let x = parseFloat(this.MIN_X); x <= parseFloat(this.MAX_X); x += parseFloat(this.STEP_X)) {
            labels.push(x.toString());
            const y = await formula.evaluate({ x, ...ADDITIONAL_MATH_CONSTANTS });
            datasets[0].data.push(y);
        }
        return { labels, datasets };
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
            this.DATA_SOURCE_FORMULA_F = document.getElementById('chart-settings-formula-f').value;
            this.MIN_X = parseFloat(document.getElementById('chart-settings-min-x').value);
            this.MAX_X = parseFloat(document.getElementById('chart-settings-max-x').value);
            this.STEP_X = parseFloat(document.getElementById('chart-settings-step-x').value);
            this.START_FROM_ZERO = document.getElementById('chart-settings-start-from-zero').checked;
            this.CHART_TYPE = document.getElementById('chart-settings-chart-type').value;
            this.CHART_TITLE = document.getElementById('chart-settings-chart-title').value;

            await reloadChart();
            await this.mountSettings(); // Re-render settings
        };

        const settingContainerElement = document.getElementById('chart-settings-container');
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
            align-items: flex-start;
            font-size: 0.8em;
        }
        </style>
        <div class="setting-main-container">
            <!-- column 1: for basic settings -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-chart-type">Chart Type</label>
                    <select id="chart-settings-chart-type" onchange="handleSettingChange()">
                        ${FormulaChartData.supportedChartTypes.map(chartType => `<option value="${chartType}">${chartType}</option>`).join('')}
                    </select>
                </div>
                <div class="setting-item">
                    <label for="chart-settings-chart-title">Chart Title</label>
                    <input type="text" id="chart-settings-chart-title" value="${this.CHART_TITLE}" onchange="handleSettingChange()">
                </div>
                <div class="setting-item">
                    <label for="chart-settings-formula-f">Formula f(x)</label>
                    <input type="text" id="chart-settings-formula-f" value="${this.DATA_SOURCE_FORMULA_F}" onchange="handleSettingChange()">
                </div>
            </div>
            <!-- column 2: for x-axis settings -->
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div class="setting-item">
                    <label for="chart-settings-min-x">Min X</label>
                    <input type="number" id="chart-settings-min-x" value="${this.MIN_X}" onchange="handleSettingChange()">
                </div>
                <div class="setting-item">
                    <label for="chart-settings-max-x">Max X</label>
                    <input type="number" id="chart-settings-max-x" value="${this.MAX_X}" onchange="handleSettingChange()">
                </div>
                <div class="setting-item">
                    <label for="chart-settings-step-x">Step X</label>
                    <input type="number" id="chart-settings-step-x" value="${this.STEP_X}" step="any" onchange="handleSettingChange()">
                </div>
                <div class="setting-item">
                    <label for="chart-settings-start-from-zero">Start from Zero</label>
                    <input type="checkbox" id="chart-settings-start-from-zero" ${this.START_FROM_ZERO ? 'checked' : ''} onchange="handleSettingChange()">
                </div>
            </div>
        </div>
        `;
        settingContainerElement.innerHTML = html;

        document.getElementById('chart-settings-chart-type').value = this.CHART_TYPE;
        document.getElementById('chart-settings-chart-title').value = this.CHART_TITLE;
        document.getElementById('chart-settings-formula-f').value = this.DATA_SOURCE_FORMULA_F;
        document.getElementById('chart-settings-min-x').value = this.MIN_X;
        document.getElementById('chart-settings-max-x').value = this.MAX_X;
        document.getElementById('chart-settings-step-x').value = this.STEP_X;
        document.getElementById('chart-settings-start-from-zero').checked = this.START_FROM_ZERO;
    }
}