import { cloneDeep } from "lodash-es";

export function getChartDataFromTable(table2DArray, seriesOrientation = "horizontal", categoryVariableIdx, seriesVariableIdxArr) {
    let table = cloneDeep(table2DArray);
    if (seriesOrientation === "vertical") {
        table = transposeArray(table);
    }
    const variables = getSeriesVariablesFromTable(table2DArray, seriesOrientation);
    const categoryLabels = table.slice(1).map(row => row[categoryVariableIdx]);
    const datasets = seriesVariableIdxArr.map(seriesVariableIdx => {
        const data = table.slice(1).map(row => row[seriesVariableIdx]);
        return {
            label: variables[seriesVariableIdx],    // series variable name
            data: data
        };
    });

    return { labels: categoryLabels, datasets };
}

export function getSeriesVariablesFromTable(table2DArray, seriesOrientation = "horizontal") {
    let table = cloneDeep(table2DArray);
    if (seriesOrientation === "vertical") {
        table = transposeArray(table);
    }
    return table[0];
}

function transposeArray(array) {
    return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}