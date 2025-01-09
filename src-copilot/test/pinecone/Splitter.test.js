import { Splitter } from '../../LocalVecDB/Splitter.js';
import {mockApp, mockNote} from "../../../common-utils/test-helpers.js";

describe('Splitter', () => {
    test('empty input should not throw error', async () => {
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue('');
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(0);
    });
    test('should correctly split content based on headers', async () => {
        const splitter = new Splitter(100);
        const content = `
# Header 1
Some content under header 1
## Subheader 1.1
More content under subheader 1.1
# Header 2
Content under header 2 under header 2
    `;
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(3);
    });
    test('should correctly split on large content', async () => {
        const content = (`Apple `).repeat(200);  // 470 instead of 500 due to header length
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(5);
    });
    test('should ignore large code blocks', async () => {
        const content = `
A apple a day keeps the doctor away
\`\`\`
${'const a = 1;'.repeat(1000)}
\`\`\`
`;
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(1);
    });
    test('works correctly with markdown formatting', async () => {
        const splitter = new Splitter(100);
        const content = `Hello **World**`;
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(1);
        // Word world should not be repeated simply because it is wrapped in bold
        // This bug was encounted when async was used with unist-util-visit
        expect(result[0].metadata.pageContent.match(/World/g).length).toBe(1);
    });
    test('should not throw when position is not available', async () => {
        // Regression test for #1
        const content = "[Test@this.theory][^1]" + "\n" +
        "[^1]: [Test@this.theory]()" + "\n" +
        "    This has no position after remark";
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(1);
    });
    test('works correctly with new line', async () => {
       const content = "This is a new line\nThis is another new line.";
       const splitter = new Splitter(100);
       const app = mockApp({uuid: 'mock-uuid'});
       app.getNoteContent = jest.fn().mockResolvedValue(content);
       const result = await splitter.splitNote(app, mockNote);
       expect(result.length).toBe(1);
       expect(result[0].metadata.pageContent.includes("\nThis is another new line."))
           .toBe(true);
    });
    test('works correctly large words', async () => {
        const content = "Apple".repeat(240);
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.splitNote(app, mockNote);
        expect(result.length).toBe(2);
    });
});