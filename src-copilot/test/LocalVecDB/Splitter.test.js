import { Splitter } from '../../LocalVecDB/splitter/Splitter.js';
import {mockApp, mockNote} from "../../../common-utils/test-helpers.js";

describe('Splitter', () => {
    test('empty input should not throw error', async () => {
        const splitter = new Splitter(100);
        const content = '';
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(0);
    });
    test('should correctly split content based on headers', async () => {
        const splitter = new Splitter(100);
        const content = `# Header 1\n` +
        `Some content under header 1\n`+
        `## Subheader 1.1\n` +
        `More content under subheader 1.1\n`+
        `# Header 2\n` +
        `Content under header 2 under header 2`;
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote);
        expect(result.length).toBe(3);
    });
    test('should correctly combine content and have correct anchor', async () => {
        const splitter = new Splitter(100);
        const content = `# Header 1\n` +
            `Some content under header 1\n`+
            `## Subheader 1.1\n` +
            `More content under subheader 1.1\n`+
            `# Header 2\n` +
            `Content under header 2 under header 2`;
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid', ['test']);
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(1);
        expect(result[0].metadata.noteTags).toStrictEqual(['test']);
        expect(result[0].metadata.noteContentPart).toContain('tags: test');
        expect(result[0].metadata.headingAnchor).toBe('Header_1');
    });

    test('should correctly split on large content', async () => {
        const splitter = new Splitter(100);
        const content = (`Apple `).repeat(200);  // 400 tokens
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(4);
    });

    test('should ignore large code blocks', async () => {
        const splitter = new Splitter(100);
        const content = "A apple a day keeps the doctor away\n" +
        "\`\`\`" + "\n" +
        `${'const a = 1;\n'.repeat(1000)}` +
        "\`\`\`";
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(1);
    });

    test('works correctly with markdown formatting', async () => {
        const splitter = new Splitter(100);
        const content = `Hello **World**`;
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(1);
        // Word world should not be repeated simply because it is wrapped in bold
        // This bug was encounted when async was used with unist-util-visit
        expect(result[0].metadata.noteContentPart.match(/World/g).length).toBe(1);
    });

    test('should not throw when position is not available', async () => {
        // Regression test for #7
        const splitter = new Splitter(100);
        const content = "[Test@this.theory][^1]" + "\n" +
        "[^1]: [Test@this.theory]()" + "\n" +
        "    This has no position after remark";
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(1);
    });

    test('works correctly with new line', async () => {
        const splitter = new Splitter(100);
        const content = "This is a new line\nThis is another new line.";
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
       const app = mockApp(mockedNote);
       const result = await splitter.splitNote(app, mockedNote, true);
       expect(result.length).toBe(1);
       expect(result[0].metadata.noteContentPart.includes("\nThis is another new line."))
           .toBe(true);
    });

    test('works correctly large words', async () => {
        const splitter = new Splitter(100);
        const content = "AppleXXX".repeat(200);
        const mockedNote = mockNote(content, 'Test Note', 'mock-uuid');
        const app = mockApp(mockedNote);
        const result = await splitter.splitNote(app, mockedNote, true);
        expect(result.length).toBe(2);
    });
});