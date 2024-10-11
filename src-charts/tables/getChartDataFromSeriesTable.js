import { cloneDeep } from "lodash-es";
import { parse2DArrayElementsAsNumberIfPossible, transposeArray } from "./getChartDataFromContingencyTable.js";

function preProcessTable(table2DArray) {
    let table = parse2DArrayElementsAsNumberIfPossible(cloneDeep(table2DArray));

    const firstColNumericCount = table.filter(row => !isNaN(parseFloat(row[0])) && isFinite(row[0])).length;
    const firstRowNumericCount = transposeArray(table).filter(row => !isNaN(parseFloat(row[0])) && isFinite(row[0])).length;

    if (firstRowNumericCount < firstColNumericCount) {
        table = transposeArray(table);
    }
    return table;
}

export function getChartDataFromSeriesTable(table2DArray, xAxisVariableIdx, yAxisVariableIdx) {
    const processedTable = preProcessTable(table2DArray);
    const variables = getVariablesFromSeriesTable(processedTable);
    const xAxisVariable = variables[xAxisVariableIdx];
    const yAxisVariable = variables[yAxisVariableIdx];
    const labels = null;
    const datasets = [{
        data: processedTable.slice(1).map(row => ({ x: row[xAxisVariableIdx], y: row[yAxisVariableIdx] })),
        label: yAxisVariable
    }]

    return { labels, datasets };
}

export function getVariablesFromSeriesTable(table2DArray) {
    const processedTable = preProcessTable(table2DArray);
    return processedTable[0];
}