import {FormulaChartData} from "./FormulaChartData.js";
import {TableChartData} from "./TableChartData.js";

export class ChartDataFactory {
    static parseChartDataFromDataSource(chartData) {
        if (chartData.DATA_SOURCE === 'note') {
            return new TableChartData(chartData);
        } else if (chartData.DATA_SOURCE === 'formula') {
            return new FormulaChartData(chartData);
        }
    }
}

