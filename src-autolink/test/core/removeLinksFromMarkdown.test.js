import {removeLinksFromMarkdown} from "../../core/removeLinksFromMarkdown.js";
import { allure } from 'jest-allure2-reporter/api';

describe('removeLinksFromMarkdown', () => {
    beforeEach(() => {
        allure.epic('src-autolink');
    });

    it('should remove all links from the markdown text', async () => {
        const markdownText = 'This is a [JavaScript](https://example.com) note.';
        const result = await removeLinksFromMarkdown(markdownText);
        expect(result).toBe('This is a JavaScript note.');
    });
});