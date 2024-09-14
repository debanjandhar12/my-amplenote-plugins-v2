import {getMarkdownTableByIdx} from "../../markdown/getMarkdownTableByIdx.js";
import {SAMPLE_MARKDOWN_DATA} from "./test-data.js";
import {parseMarkdownTable} from "../../markdown/parseMarkdownTable.js";

describe('getMarkdownTableByIdx', () => {
    test('returns the first table when idx is 0', () => {
        const result = getMarkdownTableByIdx(SAMPLE_MARKDOWN_DATA, 0);
        expect(result).toContain('| Header 1 | Header 2 |');
        expect(result).toContain('| Cell 1   | Cell 2   |');
        expect(result).toContain('| Cell 3   | Cell 4   |');
    });

    test('returns the second table when idx is 1', () => {
        const result = getMarkdownTableByIdx(SAMPLE_MARKDOWN_DATA, 1);
        expect(result).toContain('| Table 2 Header 1 | Table 2 Header 2 |');
        expect(result).toContain('| Table 2 Cell 1   | Table 2 Cell 2   |');
    });

    test('returns null when table index is out of range', () => {
        const result = getMarkdownTableByIdx(SAMPLE_MARKDOWN_DATA, 2);
        expect(result).toBeNull();
    });

    test('returns null when markdown contains no tables', () => {
        const noTableMarkdown = 'This is a markdown text without any tables.';
        const result = getMarkdownTableByIdx(noTableMarkdown, 0);
        expect(result).toBeNull();
    });
});


describe('parseMarkdownTable', () => {
    test('parses a simple table correctly', () => {
        const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
    `;
        const expected = [
            ['Header 1', 'Header 2'],
            ['Cell 1', 'Cell 2'],
            ['Cell 3', 'Cell 4']
        ];
        expect(parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('handles tables with alignment indicators', () => {
        const markdown = `
| Left | Center | Right |
|:-----|:------:|------:|
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
    `;
        const expected = [
            ['Left', 'Center', 'Right'],
            ['L1', 'C1', 'R1'],
            ['L2', 'C2', 'R2']
        ];
        expect(parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('trims cell content', () => {
        const markdown = `
| Header 1 | Header 2 |
|----------|----------|
|  Cell 1  |  Cell 2  |
| Cell 3   |   Cell 4 |
    `;
        const expected = [
            ['Header 1', 'Header 2'],
            ['Cell 1', 'Cell 2'],
            ['Cell 3', 'Cell 4']
        ];
        expect(parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('handles empty cells', () => {
        const markdown = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   |          | Cell 3   |
|          | Cell 5   |          |
    `;
        const expected = [
            ['Header 1', 'Header 2', 'Header 3'],
            ['Cell 1', '', 'Cell 3'],
            ['', 'Cell 5', '']
        ];
        expect(parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('returns an empty array for markdown without a table', () => {
        const markdown = 'This is just some regular text without a table.';
        expect(parseMarkdownTable(markdown)).toEqual([]);
    });

    test('only parses the first table if multiple are present', () => {
        const markdown = `
| Table 1 Header |
|----------------|
| Table 1 Cell   |

| Table 2 Header |
|----------------|
| Table 2 Cell   |
    `;
        const expected = [
            ['Table 1 Header'],
            ['Table 1 Cell']
        ];
        expect(parseMarkdownTable(markdown)).toEqual(expected);
    });
});