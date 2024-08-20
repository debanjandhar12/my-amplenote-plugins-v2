import _ from "lodash";

export function getChartDataFrom2DArray(table2DArray, categoryDirection = 'row') {
    const isColumnOriented = categoryDirection.toLowerCase() === 'column';
    let data = isColumnOriented ? transposeArray(table2DArray) : table2DArray;
    const dataCopy = _.cloneDeep(data);

    // -- Detect category position --
    const firstRowNumeric = isRowMostlyNumeric(data[0]);
    const lastRowNumeric = isRowMostlyNumeric(data[data.length - 1]);
    let categoryPosition;
    if (firstRowNumeric)
        categoryPosition = 'last';
    else // if (lastRowNumeric)
        categoryPosition = 'first';

    // -- Detect series position --
    const firstColNumeric = isColumnMostlyNumeric(data, 0);
    const lastColNumeric = isColumnMostlyNumeric(data, data[0].length - 1);
    let seriesPosition;
    if (firstColNumeric)
        seriesPosition = 'last';
    else if (lastColNumeric)
        seriesPosition = 'first';
    else seriesPosition = null;


    // -- Build chart data object --
    let labels; // Extract labels based on detected category position
    if (seriesPosition === 'first') {
        labels = categoryPosition === 'first' ? data[0].slice(1) : data[data.length - 1].slice(1);
    }
    else if (seriesPosition === 'last') {
        labels = categoryPosition === 'first' ? data[0].slice(0, -1) : data[data.length - 1].slice(0, -1);
    }
    else {
        labels = categoryPosition === 'first' ? data[0] : data[data.length - 1];
    }
    data = categoryPosition === 'first' ? data.slice(1) : data.slice(0, -1); // Remove category row from data

    const datasets = [];
    let seriesIndex = seriesPosition === 'first' ? 0 : (seriesPosition === 'last' ? data[0].length - 1 : null);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (seriesIndex === null && data.length === 1) {
            datasets.push(...row);
        }
        else {
            seriesIndex = seriesIndex === null ? 0 : seriesIndex;
            const seriesLabel = row[seriesIndex];
            const seriesData = seriesPosition === 'first' ? row.slice(1) : row.slice(0, -1);

            datasets.push({
                label: seriesLabel,
                data: seriesData
            });
        }
    }

    // Handle single-row data
    if (dataCopy.length === 1 && !isNaN(parseFloat(dataCopy[0][0])) && isFinite(dataCopy[0][0])) {
        labels = [dataCopy[0][dataCopy[0].length-1]];
        datasets.push(...dataCopy[0].slice(0, -1));
    }
    else if (dataCopy.length === 1 && !isNaN(parseFloat(dataCopy[0][dataCopy[0].length-1])) && isFinite(dataCopy[0].length-1)) {
        labels = [dataCopy[0][0]];
        datasets.push(...dataCopy[0].slice(1));
    }

    return { labels, datasets };
}

function transposeArray(array) {
    return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}

function isRowMostlyNumeric(row) {
    const numericCount = row.slice(1).filter(item => !isNaN(parseFloat(item)) && isFinite(item)).length;
    return numericCount > row.length / 2;
}

function isColumnMostlyNumeric(data, colIndex) {
    const numericCount = data.slice(1).filter(row => !isNaN(parseFloat(row[colIndex])) && isFinite(row[colIndex])).length;
    return numericCount > data.length / 2;
}