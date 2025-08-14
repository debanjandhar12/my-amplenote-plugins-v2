import { parseMarkdownTable } from "../../markdown/parseMarkdownTable.js";

describe('parseMarkdownTable', () => {
    test('parses basic markdown table', async () => {
        const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;

        const expected = [
            ['Header 1', 'Header 2'],
            ['Cell 1', 'Cell 2'],
            ['Cell 3', 'Cell 4']
        ];
        expect(await parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('parses table with images', async () => {
        const markdown = `
| Emoji | Name |
|-------|------|
| ![](https://example.com/smile.png) | Smile |
| ![](https://example.com/heart.png) | Heart |`;

        const expected = [
            ['Emoji', 'Name'],
            ['![](https://example.com/smile.png)', 'Smile'],
            ['![](https://example.com/heart.png)', 'Heart']
        ];
        expect(await parseMarkdownTable(markdown)).toEqual(expected);
    });

    test('parses mixed content table with text and images', async () => {
        const markdown = `
| Mixed | Content |
|-------|---------|
| Regular text | ![](https://example.com/image.png) |
| ![](https://example.com/emoji.png) | More text |`;

        const expected = [
            ['Mixed', 'Content'],
            ['Regular text', '![](https://example.com/image.png)'],
            ['![](https://example.com/emoji.png)', 'More text']
        ];
        expect(await parseMarkdownTable(markdown)).toEqual(expected);
    });
});
