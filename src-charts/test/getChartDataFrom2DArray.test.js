import {getChartDataFrom2DArray} from "../chart/getChartDataFrom2DArray.js";

describe('getChartDataFrom2DArray', () => {
    test('should handle column-oriented data with category in first row', () => {
        const table2DArray = [
            ['Category', 'Series 1', 'Series 2'],
            ['Company A', 10, 20],
            ['Company B', 15, 25],
            ['Company C', 5, 15]
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'column');
        expect(result).toEqual({
            labels: ['Company A', 'Company B', 'Company C'],
            datasets: [
                { label: 'Series 1', data: [10, 15, 5] },
                { label: 'Series 2', data: [20, 25, 15] }
            ]
        });
    });

    test('should handle column-oriented data with category in last row', () => {
        const table2DArray = [
            ['Company A', 10, 20],
            ['Company B', 15, 25],
            ['Company C', 5, 15],
            ['Category', 'Series 1', 'Series 2'],
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'column');
        expect(result).toEqual({
            labels: ['Company A', 'Company B', 'Company C'],
            datasets: [
                { label: 'Series 1', data: [10, 15, 5] },
                { label: 'Series 2', data: [20, 25, 15] }
            ]
        });
    });

    test('should handle row-oriented data with category in first column', () => {
        const table2DArray = [
            ['Series', 'Company A', 'Company B'],
            ['Series 1', 10, 20],
            ['Series 2', 15, 25],
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'row');
        expect(result).toEqual({
            labels: ['Company A', 'Company B'],
            datasets: [
                {label: 'Series 1', data: [10, 20]},
                {label: 'Series 2', data: [15, 25]}
            ]
        });
    });

    test('should handle single-row data with categoryDirection row', () => {
        const table2DArray = [
            ['Company A', 'Company B', 'Company C']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'row');
        expect(result.labels).toEqual(['Company A','Company B', 'Company C']);
        expect(result.datasets).toEqual([]);
    });

    test('should handle two-row data with categoryDirection row', () => {
        const table2DArray = [
            ['Company A', 'Company B', 'Company C'],
            ['10', '20', '30']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'row');
        expect(result.labels).toEqual(['Company A','Company B', 'Company C']);
        expect(result.datasets).toEqual(['10', '20', '30']);
    });

    test('should handle two-column data with categoryDirection column', () => {
        const table2DArray = [
            ['Company A', '10'],
            ['Company B', '20']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'column');
        expect(result.labels).toEqual(['Company A','Company B']);
        expect(result.datasets).toEqual(['10', '20']);
    });

    test('should handle single-row data with categoryDirection column (first)', () => {
        const table2DArray = [
            ['Company A', '10', '20', '30']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'row');
        expect(result.labels).toEqual(['Company A']);
        expect(result.datasets).toEqual(['10', '20', '30']);
    });

    test('should handle single-row data with categoryDirection column (end)', () => {
        const table2DArray = [
            ['10', '20', '30', 'Company A']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'row');
        expect(result.labels).toEqual(['Company A']);
        expect(result.datasets).toEqual(['10', '20', '30']);
    });

    test('should handle single-column data with categoryDirection row', () => {
        const table2DArray = [
            ['Company A'],
            ['10'],
            ['20']
        ];
        const result = getChartDataFrom2DArray(table2DArray, 'column');
        expect(result.labels).toEqual(['Company A']);
        expect(result.datasets).toEqual(['10', '20']);
    });
});