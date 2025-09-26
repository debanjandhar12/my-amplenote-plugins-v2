import { mockApp, mockNote, mockPlugin } from '../amplenote-mocks.js';
import {allure} from "jest-allure2-reporter/api";

describe('mockPlugin', () => {
    beforeEach(() => {
        allure.epic('common-utils');
    });

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
});

describe('mockNote', () => {
    beforeEach(() => {
        allure.epic('common-utils');
    });

    it('should create note with all required properties', async () => {
        const note = mockNote('# Test Note\nContent here', 'Test Note', 'test-uuid', ['tag1', 'tag2']);
        
        expect(await note.content()).toBe('# Test Note\nContent here');
        expect(note.name).toBe('Test Note');
        expect(note.uuid).toBe('test-uuid');
        expect(note.tags).toEqual(['tag1', 'tag2']);
        expect(note.lastUpdated).toBeInstanceOf(Date);
    });

    it('insertTask should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        // Test invalid taskObject
        await expect(note.insertTask(null)).rejects.toThrow('insertTask: taskObject must be an object');
        await expect(note.insertTask('string')).rejects.toThrow('insertTask: taskObject must be an object');
        
        // Test missing content/text
        await expect(note.insertTask({})).rejects.toThrow('insertTask: taskObject must have content or text property');
        
        // Test invalid content type
        await expect(note.insertTask({ content: 123 })).rejects.toThrow('insertTask: task content must be a string');
        
        // Test invalid timestamp fields
        await expect(note.insertTask({ content: 'test', dismissedAt: 'invalid' })).rejects.toThrow('insertTask: dismissedAt must be an integer timestamp');
        await expect(note.insertTask({ content: 'test', deadline: 1.5 })).rejects.toThrow('insertTask: deadline must be an integer timestamp');
        await expect(note.insertTask({ content: 'test', completedAt: 'invalid' })).rejects.toThrow('insertTask: completedAt must be an integer timestamp');
        await expect(note.insertTask({ content: 'test', endAt: 1.5 })).rejects.toThrow('insertTask: endAt must be an integer timestamp');
        await expect(note.insertTask({ content: 'test', startAt: 'invalid' })).rejects.toThrow('insertTask: startAt must be an integer timestamp');
        await expect(note.insertTask({ content: 'test', hideUntil: 1.5 })).rejects.toThrow('insertTask: hideUntil must be an integer timestamp');
    });

    it('replaceContent should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        await expect(note.replaceContent(123)).rejects.toThrow('replaceContent: newContent must be a string');
        await expect(note.replaceContent('new content', 'invalid')).rejects.toThrow('replaceContent: sectionObject must be an object');
    });

    it('insertContent should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        await expect(note.insertContent(123)).rejects.toThrow('insertContent: newContent must be a string');
        await expect(note.insertContent('new content', 'invalid')).rejects.toThrow('insertContent: options must be an object');
    });

    it('addTag should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        await expect(note.addTag(123)).rejects.toThrow('addTag: tag must be a string');
        await expect(note.addTag(null)).rejects.toThrow('addTag: tag must be a string');
    });

    it('removeTag should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        await expect(note.removeTag(123)).rejects.toThrow('removeTag: tag must be a string');
        await expect(note.removeTag(null)).rejects.toThrow('removeTag: tag must be a string');
    });

    it('setName should throw error when parameter type is wrong', async () => {
        const note = mockNote('Test content', 'Test Note', 'test-uuid');
        
        await expect(note.setName(123)).rejects.toThrow('setName: name must be a string');
        await expect(note.setName(null)).rejects.toThrow('setName: name must be a string');
    });

    it('e2e test', async () => {
        // Create a new note
        const note = mockNote('Initial content', 'Test Note', 'test-uuid', ['initial-tag']);
        
        // Check initial properties
        expect(note.uuid).toBe('test-uuid');
        expect(await note.url()).toBe('https://www.amplenote.com/notes/test-uuid');
        expect(note.tags).toEqual(['initial-tag']);
        expect(note.name).toBe('Test Note');
        expect(await note.content()).toBe('Initial content');
        
        // Test insertContent with atEnd true (add new section)
        await note.insertContent('\n\n## New Section\nNew section content', { atEnd: true });
        expect(note._content).toBe('Initial content\n\n## New Section\nNew section content');
        
        // Test sections
        const sections = await note.sections();
        expect(sections).toHaveLength(1);
        expect(sections[0]).toEqual({ anchor: 'New_Section', level: 2, text: 'New Section' });
        
        // Test replaceContent with section object
        const sectionObj = { section: { heading: { text: 'New Section', level: 2 } } };
        await note.replaceContent('New Section content with ![image](https://images.amplenote.com/a532ec7c-7ce2-11ef-96da-266cb2807bd1/4554dfde-d129-414f-b36b-b1cee86bcd8e.jpg)', sectionObj);
        
        // Test content after replacement
        const updatedContent = await note.content();
        expect(updatedContent).toContain('New Section content with ![image]');
        
        // Test images
        const images = await note.images();
        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('https://images.amplenote.com/a532ec7c-7ce2-11ef-96da-266cb2807bd1/4554dfde-d129-414f-b36b-b1cee86bcd8e.jpg');
        expect(images[0].caption).toBe('image');
        
        // Test updateImage
        await note.updateImage(images[0], { caption: "**new caption**" });
        const updatedImages = await note.images();
        expect(updatedImages[0].caption).toBe('**new caption**');
        
        // Test insertTask
        const taskUUID = await note.insertTask({ content: "this is a task" });
        expect(typeof taskUUID).toBe('string');
        
        // Test tasks
        const tasks = await note.tasks();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].content).toBe('this is a task');
        expect(tasks[0].taskUUID).toBe(taskUUID);
        
        // Test addTag
        await note.addTag("some-tag");
        expect(note.tags).toContain("some-tag");
        
        // Test removeTag
        await note.removeTag("some-tag");
        expect(note.tags).not.toContain("some-tag");
        
        // Test setName
        const originalName = note.name;
        await note.setName("Updated Name");
        expect(note.name).toBe("Updated Name");
        
        // Test delete
        await note.delete();
        expect(note._deleted).toBe(true);
    });
});

describe('mockApp', () => {
    beforeEach(() => {
        allure.epic('common-utils');
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

    it('should work without seed note', () => {
        const app = mockApp();
        
        // Verify empty registry
        expect(Object.keys(app._noteRegistry)).toHaveLength(0);
        expect(app.context.noteUUID).toBeNull();
    });

    it('note list management e2e test', async () => {
        const app = mockApp();
        
        // Test notes.create
        const newNote = await app.notes.create("some new note", ["some-tag"]);
        expect(newNote.name).toBe("some new note");
        expect(newNote.tags).toEqual(["some-tag"]);
        expect(app._noteRegistry[newNote.uuid]).toBe(newNote);
        
        // Test notes.filter
        const filteredNotes = await app.notes.filter({ tag: "some-tag" });
        expect(filteredNotes).toHaveLength(1);
        expect(filteredNotes[0]).toBe(newNote);
        
        // Test notes.find with UUID string
        const foundByUUID = await app.notes.find(newNote.uuid);
        expect(foundByUUID).toBe(newNote);
        
        // Test notes.find with name object
        const foundByName = await app.notes.find({ name: "some new note" });
        expect(foundByName).toBe(newNote);
        
        // Test notes.find with uuid object
        const foundByUUIDObj = await app.notes.find({ uuid: newNote.uuid });
        expect(foundByUUIDObj).toBe(newNote);
        
        // Create another note for daily-jots test
        const dailyNote = await app.notes.create("daily note", ["daily-jots"]);
        
        // Test filterNotes
        const dailyNotes = await app.filterNotes({ tag: "daily-jots" });
        expect(dailyNotes).toHaveLength(1);
        expect(dailyNotes[0]).toBe(dailyNote);
        
        // Test findNote with uuid object
        const foundNote = app.findNote({ uuid: newNote.uuid });
        expect(foundNote).toBe(newNote);
        
        // Test deleteNote
        const deleted = await app.deleteNote({ uuid: newNote.uuid });
        expect(deleted).toBe(true);
        expect(app._noteRegistry[newNote.uuid]).toBeUndefined();
    });

    it('note manipulation e2e test', async () => {
        const app = mockApp();
        
        // Create a test note with content
        const note = await app.notes.create("Test Note", ["test-tag"], "# Test\nInitial content\n\n## Section\nSection content");
        const noteUUID = note.uuid;
        
        // Test getNoteContent
        const content = await app.getNoteContent({ uuid: noteUUID });
        expect(content).toBe("# Test\nInitial content\n\n## Section\nSection content");
        
        // Add an image to test getNoteImages
        await note.insertContent('\n![test image](https://example.com/image.jpg)');
        const images = await app.getNoteImages({ uuid: noteUUID });
        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('https://example.com/image.jpg');
        
        // Test getNoteSections
        const sections = await app.getNoteSections({ uuid: noteUUID });
        expect(sections).toHaveLength(2);
        expect(sections[0].text).toBe('Test');
        expect(sections[1].text).toBe('Section');
        
        // Test insertTask and getNoteTasks
        const taskUUID = await app.insertTask({ uuid: noteUUID }, { content: "this is a task" });
        const tasks = await app.getNoteTasks({ uuid: noteUUID });
        expect(tasks).toHaveLength(1);
        expect(tasks[0].content).toBe('this is a task');
        
        // Test getTask
        const task = await app.getTask(taskUUID);
        expect(task).toBeTruthy();
        expect(task.content).toBe('this is a task');
        
        // Test updateNoteImage
        await app.updateNoteImage({ uuid: noteUUID }, images[0], { caption: "**new caption**" });
        const updatedImages = await app.getNoteImages({ uuid: noteUUID });
        expect(updatedImages[0].caption).toBe('**new caption**');
        
        // Test replaceNoteContent
        await app.replaceNoteContent({ uuid: noteUUID }, "Completely new content");
        const newContent = await app.getNoteContent({ uuid: noteUUID });
        expect(newContent).toBe("Completely new content");
        
        // Re-add task for updateTask test
        const newTaskUUID = await app.insertTask({ uuid: noteUUID }, { content: "another task" });
        
        // Test updateTask
        const completedAt = Math.floor(Date.now() / 1000);
        await app.updateTask(newTaskUUID, { completedAt: completedAt });
        const updatedTask = await app.getTask(newTaskUUID);
        expect(updatedTask.completedAt).toBe(completedAt);
        
        // Test insertTask with text property
        const textTaskUUID = await app.insertTask({ uuid: noteUUID }, { text: "this is a task with text property" });
        const textTask = await app.getTask(textTaskUUID);
        expect(textTask.content).toBe('this is a task with text property');
    });

    it('updateTask should work across multiple notes', async () => {
        const app = mockApp();
        
        // Create multiple notes with tasks
        const note1 = await app.notes.create("Note 1", [], "Content 1");
        const note2 = await app.notes.create("Note 2", [], "Content 2");
        
        const task1UUID = await app.insertTask({ uuid: note1.uuid }, { content: "task in note 1" });
        const task2UUID = await app.insertTask({ uuid: note2.uuid }, { content: "task in note 2" });
        
        // Update task in note 2
        const completedAt = Math.floor(Date.now() / 1000);
        await app.updateTask(task2UUID, { completedAt: completedAt });
        
        // Verify task was updated
        const updatedTask = await app.getTask(task2UUID);
        expect(updatedTask.completedAt).toBe(completedAt);
        
        // Verify task in note 1 was not affected
        const task1 = await app.getTask(task1UUID);
        expect(task1.completedAt).toBeNull();
    });
});