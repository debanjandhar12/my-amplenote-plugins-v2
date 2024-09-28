import {removeLinksFromMarkdown} from "../../core/removeLinksFromMarkdown.js";

describe('removeLinksFromMarkdown', () => {
    it('should remove all links from the markdown text', async () => {
        const markdownText = 'This is a [JavaScript](https://example.com) note.';
        const result = await removeLinksFromMarkdown(markdownText);
        expect(result).toBe('This is a JavaScript note.');
    });
});