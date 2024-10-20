import { Splitter } from '../../pinecone/Splitter';
import {mockApp, mockNote} from "../../../common-utils/test-helpers.js";

describe('Splitter', () => {
    test('should correctly split content based on headers', async () => {
        const splitter = new Splitter(100);
        const content = `
# Header 1
Some content under header 1
## Subheader 1.1
More content
# Header 2
Content under header 2
    `;
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.split(app, mockNote);
        expect(result.length).toBe(4);
    });

    test('should correctly split on large content', async () => {
        const content = `
        Hello World
        `.repeat(185);
        const splitter = new Splitter(100);
        const app = mockApp({uuid: 'mock-uuid'});
        app.getNoteContent = jest.fn().mockResolvedValue(content);
        const result = await splitter.split(app, mockNote);
        expect(result.length).toBe(5);
    });
});