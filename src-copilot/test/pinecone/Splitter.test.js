import { Splitter } from '../../pinecone/Splitter';
import {mockApp, mockNote} from "../../../common-utils/test-helpers.js";

describe('Splitter', () => {
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
        const result = await splitter.split(app, mockNote);
        expect(result.length).toBe(4);  // 3 headers + 1 for tags
    });

    test('should correctly split on large content', async () => {
        const content = (`Apple `).repeat(470);  // 470 instead of 500 due to header length
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.split(app, mockNote);
        expect(result.length).toBe(6); // 5 content parts + 1 for tags
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
        const result = await splitter.split(app, mockNote);
        expect(result.length).toBe(2); // 1 content part + 1 for tags
    });
});