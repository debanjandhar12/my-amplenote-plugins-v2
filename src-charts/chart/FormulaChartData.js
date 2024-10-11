import {BaseChartData} from "./BaseChartData.js";
import Formula from "fparser";
import {ADDITIONAL_MATH_CONSTANTS} from "../constants.js";

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
            label: 'f(x)',
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
        return chartJSParamObj;
    }

    /** -- Settings related functionality -- */
    async mountSettings() {
        await super.mountSettings();

    }
}