import {addPageLinksToMarkdown, addSectionLinksToMarkdown, processReplacementMap} from "../../core/linker.js";

describe('addPageLinksToMarkdown and processReplacementMap works correctly', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should link text nodes with page names', async () => {
        const markdownText = 'This is a note about JavaScript.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is a note about [JavaScript](https://www.amplenote.com/notes/123).');
    });
    it('should link text nodes seperated by comma', async () => {
        const markdownText = 'JavaScript,JavaScript, JavaScript, JavaScript.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('[JavaScript](https://www.amplenote.com/notes/123),[JavaScript](https://www.amplenote.com/notes/123), [JavaScript](https://www.amplenote.com/notes/123), [JavaScript](https://www.amplenote.com/notes/123).');
    });
    it('should handle multiple pages with similar names', async () => {
        const markdownText = 'This is a note about JavaScript and Java.';
        const pages = [
            { name: 'JavaScript', uuid: '123' },
            { name: 'Java', uuid: '456' }
        ];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is a note about [JavaScript](https://www.amplenote.com/notes/123) and [Java](https://www.amplenote.com/notes/456).');
    });
    it('should return the original text if no pages match', async () => {
        const markdownText = 'This is a note about Python.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is a note about Python.');
    });
    it('should handle empty text', async () => {
        const markdownText = '';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('');
    });
    it('should not alter text nodes inside links', async () => {
        const markdownText = 'This is a [JavaScript](https://example.com) note.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is a [JavaScript](https://example.com) note.');
    });
    it('should not alter text nodes inside images', async () => {
        const markdownText = 'This is an image ![JavaScript](https://example.com/JavaScript.png).';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is an image ![JavaScript](https://example.com/JavaScript.png).');
    });
    it('should not alter text nodes inside object html tags', async () => {
        const markdownText = 'This is an object <object data="JavaScript"></object>.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is an object <object data="JavaScript"></object>.');
    });
    it('should not alter text nodes inside code blocks', async () => {
        const markdownText = 'This is a code block:\n```\nJavaScript\n```\n';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is a code block:\n```\nJavaScript\n```\n');
    });
    it('should not alter text nodes inside inline code', async () => {
        const markdownText = 'This is inline code `JavaScript`.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is inline code `JavaScript`.');
    });
    it('should alter text nodes inside bold text', async () => {
        const markdownText = 'This is **JavaScript**.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is **[JavaScript](https://www.amplenote.com/notes/123)**.');
    });
    it('should alter text nodes inside italic text', async () => {
        const markdownText = 'This is *JavaScript*.';
        const pages = [{ name: 'JavaScript', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('This is *[JavaScript](https://www.amplenote.com/notes/123)*.');
    });
    it('regression #1: should link text irrespective of casing', async () => {
        const markdownText = 'Javascript Tips';
        const pages = [{ name: 'JavaScript tips', uuid: '123' }];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe('[Javascript Tips](https://www.amplenote.com/notes/123)');
    });
    it('regression #2: should work with multiple pages', async () => {
        const markdownText = 'Javascript Tips website is great resource for learning JavaScript.';
        const pages = [
            { name: 'JavaScript', uuid: '123' },
            { name: 'JavaScript tips', uuid: '456' }
        ];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe(
            '[Javascript Tips](https://www.amplenote.com/notes/456) website is great resource for learning [JavaScript](https://www.amplenote.com/notes/123).'
        );
    });
    it('regression #3: should work with same page one after another when there are spaces as seperator', async () => {
        const markdownText = 'Javascript Tips Javascript Tips Javascript TipsJavascript Tips';
        const pages = [
            { name: 'Javascript Tips', uuid: '456' }
        ];
        const {preReplacementMarkdown, replacementMap} = await addPageLinksToMarkdown(markdownText, pages);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe(
            '[Javascript Tips](https://www.amplenote.com/notes/456) [Javascript Tips](https://www.amplenote.com/notes/456) Javascript TipsJavascript Tips'
        );
    });
});
describe('addSectionLinksToMarkdown and processReplacementMap works correctly', () => {
    it('should link text nodes with section names', async () => {
        const markdownText = 'This is a note about JavaScript Basics.';
        const sectionsMap = {
            'JavaScript Basics': { noteUUID: '123', anchor: 'section-1' }
        };
        const { preReplacementMarkdown, replacementMap } = await addSectionLinksToMarkdown(markdownText, sectionsMap);
        expect(processReplacementMap(preReplacementMarkdown, replacementMap)).toBe(
            'This is a note about [JavaScript Basics](https://www.amplenote.com/notes/123#section-1).'
        );
    });
});