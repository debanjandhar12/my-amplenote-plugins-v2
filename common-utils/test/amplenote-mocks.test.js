import { mockApp, mockNote, mockPlugin } from '../amplenote-mocks.js';
import {allure} from "jest-allure2-reporter/api";

describe('Sinon-based test helpers', () => {
    beforeEach(() => {
        allure.epic('common-utils');
    });

    describe('mockApp', () => {
        it('should create app with Sinon stubs instead of Jest mocks', () => {
            const app = mockApp();

            // Verify all methods are Sinon stubs by checking for Sinon-specific properties
            expect(app.createNote.isSinonProxy).toBe(true);
            expect(app.getNoteContent.isSinonProxy).toBe(true);
            expect(app.prompt.isSinonProxy).toBe(true);
            expect(app.navigate.isSinonProxy).toBe(true);
            expect(app.notes.find.isSinonProxy).toBe(true);
            expect(app.notes.filter.isSinonProxy).toBe(true);
            expect(app.notes.create.isSinonProxy).toBe(true);
            expect(app.filterNotes.isSinonProxy).toBe(true);
            expect(app.getNoteImages.isSinonProxy).toBe(true);
            expect(app.setSetting.isSinonProxy).toBe(true);

            // Verify stubs have proper Sinon methods
            expect(typeof app.createNote.resolves).toBe('function');
            expect(typeof app.createNote.rejects).toBe('function');
            expect(typeof app.createNote.callsFake).toBe('function');
            expect(typeof app.createNote.returns).toBe('function');
        });

        it('should properly configure async stubs with resolves/rejects', async () => {
            const app = mockApp();
            
            // Configure async behavior using Sinon methods
            app.getNoteImages.resolves([{ src: 'test.png', text: 'Test Image' }]);
            app.prompt.resolves('user input');
            app.createNote.rejects(new Error('Creation failed'));

            // Test resolved values
            const images = await app.getNoteImages();
            expect(images).toEqual([{ src: 'test.png', text: 'Test Image' }]);

            const userInput = await app.prompt();
            expect(userInput).toBe('user input');

            // Test rejected values
            await expect(app.createNote()).rejects.toThrow('Creation failed');
        });

        it('should work with seed note', () => {
            const seedNote = mockNote('Test content', 'Test Note', 'test-uuid', ['tag1']);
            const app = mockApp(seedNote);

            // Verify seed note is in registry
            expect(app._noteRegistry['test-uuid']).toBe(seedNote);
            
            // Test note finding functionality
            const foundNote = app.findNote('test-uuid');
            expect(foundNote).toBe(seedNote);
            expect(foundNote.name).toBe('Test Note');
        });

        it('should handle note creation with Sinon stubs', () => {
            const app = mockApp();
            
            // Create a note using the mock
            const newNote = app.createNote('New Note', ['tag1', 'tag2'], 'Note content');
            
            // Verify note was created and added to registry
            expect(newNote.name).toBe('New Note');
            expect(newNote.tags).toEqual(['tag1', 'tag2']);
            expect(newNote._content).toBe('Note content');
            expect(app._noteRegistry[newNote.uuid]).toBe(newNote);
            
            // Verify stub was called
            expect(app.createNote.calledOnce).toBe(true);
            expect(app.createNote.calledWith('New Note', ['tag1', 'tag2'], 'Note content')).toBe(true);
        });

        it('should handle note filtering with Sinon stubs', () => {
            const note1 = mockNote('Content 1', 'Note 1', 'uuid1', ['work', 'important']);
            const note2 = mockNote('Content 2', 'Note 2', 'uuid2', ['personal', 'work']);
            const note3 = mockNote('Content 3', 'Note 3', 'uuid3', ['personal']);
            
            const app = mockApp();
            app._noteRegistry = {
                'uuid1': note1,
                'uuid2': note2,
                'uuid3': note3
            };

            // Test filtering by tag
            const workNotes = app.filterNotes({ tag: 'work' });
            expect(workNotes).toHaveLength(2);
            expect(workNotes).toContain(note1);
            expect(workNotes).toContain(note2);

            const personalNotes = app.filterNotes({ tag: 'personal' });
            expect(personalNotes).toHaveLength(2);
            expect(personalNotes).toContain(note2);
            expect(personalNotes).toContain(note3);

            // Verify stub was called
            expect(app.filterNotes.callCount).toBe(2);
        });

        it('should handle settings with Sinon stubs', async () => {
            const app = mockApp();
            
            // Set some settings
            await app.setSetting('apiKey', 'test-key');
            await app.setSetting('theme', 'dark');
            
            // Verify settings were set
            expect(app.settings.apiKey).toBe('test-key');
            expect(app.settings.theme).toBe('dark');
            
            // Verify stub calls
            expect(app.setSetting.callCount).toBe(2);
            expect(app.setSetting.calledWith('apiKey', 'test-key')).toBe(true);
            expect(app.setSetting.calledWith('theme', 'dark')).toBe(true);
        });
    });

    describe('mockNote', () => {
        it('should create note with all required properties', () => {
            const note = mockNote('# Test Note\nContent here', 'Test Note', 'test-uuid', ['tag1', 'tag2']);
            
            expect(note._content).toBe('# Test Note\nContent here');
            expect(note.name).toBe('Test Note');
            expect(note.uuid).toBe('test-uuid');
            expect(note.tags).toEqual(['tag1', 'tag2']);
            expect(note.lastUpdated).toBeInstanceOf(Date);
            
            // Verify methods exist
            expect(typeof note.content).toBe('function');
            expect(typeof note.insertContent).toBe('function');
            expect(typeof note.replaceContent).toBe('function');
            expect(typeof note.sections).toBe('function');
        });

        it('should handle content insertion', async () => {
            const note = mockNote('Initial content', 'Test Note', 'test-uuid');
            const initialTime = note.lastUpdated;
            
            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1));
            
            await note.insertContent('\nNew content');
            
            expect(note._content).toBe('Initial content\n\nNew content');
            expect(note.lastUpdated.getTime()).toBeGreaterThan(initialTime.getTime());
        });

        it('should handle content insertion at end', async () => {
            const note = mockNote('Initial content', 'Test Note', 'test-uuid');
            
            await note.insertContent('Appended', { atEnd: true });
            
            expect(note._content).toBe('Initial contentAppended');
        });

        it('should handle full content replacement', async () => {
            const note = mockNote('Old content', 'Test Note', 'test-uuid');
            const initialTime = note.lastUpdated;
            
            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1));
            
            await note.replaceContent('New content');
            
            expect(note._content).toBe('New content');
            expect(note.lastUpdated.getTime()).toBeGreaterThan(initialTime.getTime());
        });

        it('should handle section-based content replacement', async () => {
            const note = mockNote(
                '# Main Title\nIntro content\n\n## Section 1\nSection 1 content\n\n## Section 2\nSection 2 content',
                'Test Note',
                'test-uuid'
            );
            
            await note.replaceContent('New section 1 content', {
                section: { heading: { text: 'Section 1', level: 2 } }
            });
            
            expect(note._content).toContain('New section 1 content');
            expect(note._content).toContain('## Section 1');
            expect(note._content).toContain('## Section 2\nSection 2 content');
        });

        it('should throw error for non-existent section', async () => {
            const note = mockNote('# Main Title\nContent', 'Test Note', 'test-uuid');
            
            await expect(note.replaceContent('New content', {
                section: { heading: { text: 'Non-existent Section' } }
            })).rejects.toThrow('Could not find section Non-existent Section');
        });

        it('should parse sections correctly', async () => {
            const note = mockNote(
                '# Main Title\nIntro\n\n## Section One\nContent 1\n\n### Subsection\nSub content\n\n## Section Two\nContent 2',
                'Test Note',
                'test-uuid'
            );
            
            const sections = await note.sections();
            
            expect(sections).toHaveLength(4);
            expect(sections[0]).toEqual({ anchor: 'Main_Title', level: 1, text: 'Main Title' });
            expect(sections[1]).toEqual({ anchor: 'Section_One', level: 2, text: 'Section One' });
            expect(sections[2]).toEqual({ anchor: 'Subsection', level: 3, text: 'Subsection' });
            expect(sections[3]).toEqual({ anchor: 'Section_Two', level: 2, text: 'Section Two' });
        });
    });

    describe('mockPlugin', () => {
        it('should properly bind plugin methods', () => {
            const plugin = mockPlugin({
                insertText: {
                    'Insert Hello': {
                        run: function() { return `Hello from ${this.name || 'plugin'}`; }
                    }
                },
                noteOption: {
                    'Process Note': {
                        run: function() { return `Processing with ${this.name || 'plugin'}`; }
                    }
                },
                replaceText: {
                    'Replace Text': {
                        run: function() { return `Replacing with ${this.name || 'plugin'}`; }
                    }
                },
                name: 'Test Plugin'
            });
            
            expect(plugin.insertText['Insert Hello']()).toBe('Hello from Test Plugin');
            expect(plugin.noteOption['Process Note']()).toBe('Processing with Test Plugin');
            expect(plugin.replaceText['Replace Text']()).toBe('Replacing with Test Plugin');
        });

        it('should handle plugins without run methods', () => {
            const plugin = mockPlugin({
                insertText: {
                    'Direct Function': function() { return 'Direct result'; }
                }
            });
            
            expect(plugin.insertText['Direct Function']()).toBe('Direct result');
        });

        it('should handle empty plugin objects', () => {
            const plugin = mockPlugin({});
            
            expect(plugin).toEqual({});
        });
    });
});