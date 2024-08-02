import {autoLinkMarkdownWithPageLinks} from "../core/linker.js";

describe('autoLinkMarkdownWithPageLinks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should link text nodes with page names', async () => {
        const markdownText = 'This is a note about JavaScript.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is a note about [JavaScript](https://www.amplenote.com/notes/123).');
    });

    it('should handle multiple pages with similar names', async () => {
        const markdownText = 'This is a note about JavaScript and Java.';
        const pages = [
            { name: 'JavaScript', uuid: '123' },
            { name: 'Java', uuid: '456' }
        ];
        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is a note about [JavaScript](https://www.amplenote.com/notes/123) and [Java](https://www.amplenote.com/notes/456).');
    });

    it('should return the original text if no pages match', async () => {
        const markdownText = 'This is a note about Python.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is a note about Python.');
    });

    it('should handle empty text', async () => {
        const markdownText = '';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('');
    });

    it('should not alter text nodes inside links', async () => {
        const markdownText = 'This is a [JavaScript](https://example.com) note.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is a [JavaScript](https://example.com) note.');
    });

    it('should not alter text nodes inside images', async () => {
        const markdownText = 'This is an image ![JavaScript](https://example.com/JavaScript.png).';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is an image ![JavaScript](https://example.com/JavaScript.png).');
    });

    it('should not alter text nodes inside object html tags', async () => {
        const markdownText = 'This is an object <object data="JavaScript"></object>.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is an object <object data="JavaScript"></object>.');
    });

    it('should not alter text nodes inside code blocks', async () => {
        const markdownText = 'This is a code block:\n```\nJavaScript\n```\n';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is a code block:\n```\nJavaScript\n```\n');
    });

    it('should not alter text nodes inside inline code', async () => {
        const markdownText = 'This is inline code `JavaScript`.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is inline code `JavaScript`.');
    });

    it('should alter text nodes inside bold text', async () => {
        const markdownText = 'This is **JavaScript**.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is **[JavaScript](https://www.amplenote.com/notes/123)**.');
    });

    it('should alter text nodes inside italic text', async () => {
        const markdownText = 'This is *JavaScript*.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];

        const result = await autoLinkMarkdownWithPageLinks(markdownText, pages);
        expect(result).toBe('This is *[JavaScript](https://www.amplenote.com/notes/123)*.');
    });
});