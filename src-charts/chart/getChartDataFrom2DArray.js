export function getChartDataFrom2DArray(table2DArray, categoryDirection = 'row') {
    if (!Array.isArray(table2DArray) || table2DArray.length === 0 || !Array.isArray(table2DArray[0])) {
        throw new Error('Invalid input: table2DArray must be a non-empty 2D array');
    }

    const rows = table2DArray.length;
    const cols = table2DArray[0].length;

    let labels, datasets;

    if (categoryDirection === 'row') {
        labels = table2DArray[0].slice(1);
        datasets = table2DArray.slice(1).map(row => ({
            label: row[0],
            data: row.slice(1)
        }));
    } else if (categoryDirection === 'column') {
        labels = table2DArray.slice(1).map(row => row[0]);
        datasets = table2DArray[0].slice(1).map((_, index) => ({
            label: table2DArray[0][index + 1],
            data: table2DArray.slice(1).map(row => row[index + 1])
        }));
    } else {
        throw new Error('Invalid categoryDirection: must be either "row" or "column"');
    }

    return {
        labels,
        datasets
    };
}