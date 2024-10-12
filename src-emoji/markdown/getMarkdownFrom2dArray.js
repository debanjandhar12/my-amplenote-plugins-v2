export function getMarkdownFrom2dArray(array2d) {
    if (!array2d || array2d.length === 0) return '';

    const tableHeaders = array2d[0];
    const columnWidths = tableHeaders.map((_, index) => {
        return Math.max(...array2d.map(row => String(row[index]).length));
    });

    const createRow = (row) => {
        return '| ' + row.map((cell, index) => {
            const cellStr = String(cell);
            return cellStr + ' '.repeat(columnWidths[index] - cellStr.length);
        }).join(' | ') + ' |';
    };

    const separatorRow = '| ' + columnWidths.map(width => '-'.repeat(width)).join(' | ') + ' |';

    const markdownRows = [
        createRow(tableHeaders),
        separatorRow,
        ...array2d.slice(1).map(createRow)
    ];

    return markdownRows.join('\n');
}