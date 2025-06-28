import { DuckDBManager } from '../../../LocalVecDB/DuckDB/DuckDBManager.js';

describe('DuckDBManager', () => {
    let duckDBManager;

    beforeEach(() => {
        duckDBManager = new DuckDBManager();
    });

    test('should handle singleton pattern', () => {
        const manager1 = new DuckDBManager();
        const manager2 = new DuckDBManager();
        expect(manager1).toBe(manager2);
    });

    test('should transform splitter object to DuckDB format', () => {
        const splitterObj = {
            id: 'test-id',
            actualNoteContentPart: 'test content',
            embeddings: new Float32Array([1.0, 2.0, 3.0]),
            headingAnchor: 'test-anchor',
            isArchived: false,
            isPublished: true,
            isSharedByMe: false,
            isSharedWithMe: false,
            isTaskListNote: true,
            noteTags: ['tag1', 'tag2'],
            noteTitle: 'Test Note',
            noteUUID: 'test-uuid',
            processedNoteContent: 'processed content'
        };

        const transformed = duckDBManager._transformSplitterObjectToDuckDB(splitterObj);
        
        expect(transformed.id).toBe('test-id');
        expect(transformed.embeddings).toEqual([1.0, 2.0, 3.0]);
        expect(transformed.headingAnchor).toBe('test-anchor');
        expect(transformed.isPublished).toBe(true);
        expect(transformed.noteTags).toEqual(['tag1', 'tag2']);
    });

    test('should transform DuckDB object to splitter format', () => {
        const duckDBObj = {
            id: 'test-id',
            actualNoteContentPart: 'test content',
            embeddings: [1.0, 2.0, 3.0],
            headingAnchor: 'test-anchor',
            isArchived: false,
            isPublished: true,
            isSharedByMe: false,
            isSharedWithMe: false,
            isTaskListNote: true,
            noteTags: ['tag1', 'tag2'],
            noteTitle: 'Test Note',
            noteUUID: 'test-uuid',
            processedNoteContent: 'processed content'
        };

        const transformed = duckDBManager._transformDuckDBObjectToSplitter(duckDBObj);
        
        expect(transformed.id).toBe('test-id');
        expect(transformed.embeddings).toBeInstanceOf(Float32Array);
        expect(transformed.embeddings).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(transformed.headingAnchor).toBe('test-anchor');
        expect(transformed.isPublished).toBe(true);
        expect(transformed.noteTags).toEqual(['tag1', 'tag2']);
    });

    test('should handle null/undefined embeddings', () => {
        const objWithNullEmbeddings = {
            id: 'test-id',
            embeddings: null,
            noteUUID: 'test-uuid'
        };

        const transformed = duckDBManager._transformSplitterObjectToDuckDB(objWithNullEmbeddings);
        expect(transformed.embeddings).toEqual([]);

        const backTransformed = duckDBManager._transformDuckDBObjectToSplitter(transformed);
        expect(backTransformed.embeddings).toBeInstanceOf(Float32Array);
        expect(backTransformed.embeddings.length).toBe(0);
    });

    test('should handle null headingAnchor', () => {
        const obj = {
            id: 'test-id',
            headingAnchor: null,
            noteUUID: 'test-uuid'
        };

        const transformed = duckDBManager._transformSplitterObjectToDuckDB(obj);
        expect(transformed.headingAnchor).toBeNull();
    });

    test('should validate input objects without database operations', () => {
        const invalidObj = {
            noteUUID: 'test-uuid'
        };

        const transformedObj = duckDBManager._transformSplitterObjectToDuckDB(invalidObj);
        expect(transformedObj.id).toBeUndefined();
        expect(transformedObj.noteUUID).toBe('test-uuid');
    });
});