import dotenv from "dotenv"
import sinon from "sinon"
import { nanoid } from "nanoid"

dotenv.config();

// --------------------------------------------------------------------------------------
/**
 * Creates a mock plugin object for plugin testing.
 */
export const mockPlugin = (pluginObject) => {
    const plugin = { ...pluginObject };

    const bindPluginMethods = (methodGroup) => {
        if (plugin[methodGroup]) {
            Object.entries(plugin[methodGroup]).forEach(([key]) => {
                plugin[methodGroup][key] = plugin[methodGroup][key].run?.bind(plugin) || plugin[methodGroup][key].bind(plugin);
            });
        }
    };
    bindPluginMethods('appOption');
    bindPluginMethods('insertText');
    bindPluginMethods('replaceText');
    bindPluginMethods('noteOption');
    bindPluginMethods('taskOption');
    bindPluginMethods('imageOption');

    return plugin;
}

// --------------------------------------------------------------------------------------
/**
 * Creates a comprehensive mock Amplenote app object.
 *
 * @param {Object} [seedNote] - Optional note to seed the app's note registry
 * @returns {Object} Mock app object with Sinon stubs
 *
 * @example
 * // Basic usage
 * const app = mockApp();
 *
 * // With seed note
 * const seedNote = mockNote('Test content', 'Test Note', 'test-uuid');
 * const app = mockApp(seedNote);
 *
 * // Configure additional stubs
 * app.getNoteImages.resolves([{ src: 'test.png', text: 'Test' }]);
 */
export const mockApp = seedNote => {
    const app = {};
    app.alert = text => console.error("Alert was called", text);
    app.context = {};
    app.context.noteUUID = seedNote ? seedNote.uuid : null;
    app.createNote = sinon.stub();
    app.getNoteContent = sinon.stub();
    app.prompt = sinon.stub();
    app.navigate = sinon.stub();
    app.notes = {};
    app.notes.find = sinon.stub().resolves(null);
    app.notes.filter = sinon.stub().resolves([]);
    app.notes.create = sinon.stub();
    app.filterNotes = sinon.stub().resolves([]);
    app.getNoteImages = sinon.stub().resolves([]);
    app.settings = {};
    app._noteRegistry = {};

    if (seedNote) {
        app._noteRegistry[seedNote.uuid] = seedNote;
    }

    // app.findNote returns note handles (not note interface)
    const appFindNote = sinon.stub();
    appFindNote.callsFake(noteHandle => {
        if (typeof noteHandle === "string") {
            const note = app._noteRegistry[noteHandle];
            return note ? { uuid: note.uuid, name: note.name, tags: note.tags } : null;
        } else if (noteHandle && noteHandle.uuid) {
            const note = app._noteRegistry[noteHandle.uuid];
            return note ? { uuid: note.uuid, name: note.name, tags: note.tags } : null;
        } else if (noteHandle && noteHandle.name) {
            const note = Object.values(app._noteRegistry).find(n => n.name === noteHandle.name);
            return note ? { uuid: note.uuid, name: note.name, tags: note.tags } : null;
        }
        return null;
    });

    // app.notes.find returns note interface
    const notesFindFunction = sinon.stub();
    notesFindFunction.callsFake(noteHandle => {
        if (typeof noteHandle === "string") {
            return app._noteRegistry[noteHandle] || null;
        } else if (noteHandle && noteHandle.uuid) {
            return app._noteRegistry[noteHandle.uuid] || null;
        } else if (noteHandle && noteHandle.name) {
            return Object.values(app._noteRegistry).find(note => note.name === noteHandle.name) || null;
        }
        return null;
    });

    const getContent = sinon.stub();
    getContent.callsFake(noteHandle => {
        const note = typeof noteHandle === 'string' ?
            app._noteRegistry[noteHandle] :
            app._noteRegistry[noteHandle?.uuid];
        return note ? note._content : null;
    });

    app.findNote = appFindNote;
    app.notes.find = notesFindFunction;
    app.getNoteContent = getContent;

    const filterNotesByParams = (params) => {
        let notes = Object.values(app._noteRegistry);
        // If no params provided, return all notes
        if (!params || Object.keys(params).length === 0) {
            return notes;
        }
        // Filter by tag
        if (params.tag) {
            notes = notes.filter(note => {
                if (!note.tags) return false;
                return note.tags.some(noteTag => noteTag.includes(params.tag));
            });
        }
        // Filter by name
        if (params.name) {
            notes = notes.filter(note => note.name && note.name.includes(params.name));
        }
        // Filter by content
        if (params.content) {
            notes = notes.filter(note => note._content && note._content.includes(params.content));
        }
        return notes;
    };

    const mockFilterNotes = sinon.stub();
    mockFilterNotes.callsFake(params => {
        const notes = filterNotesByParams(params);
        return notes.map(note => ({ uuid: note.uuid, name: note.name, tags: note.tags })); // app.filterNotes returns note handles
    });

    const mockNotesFilter = sinon.stub();
    mockNotesFilter.callsFake(params => {
        return filterNotesByParams(params); // app.notes.filter returns note interfaces
    });

    app.notes.filter = mockNotesFilter;
    app.filterNotes = mockFilterNotes;

    const mockCreateNote = sinon.stub();
    mockCreateNote.callsFake((title, tags, content, uuid) => {
        if (!uuid) uuid = nanoid();
        const newNote = mockNote(content || '', title || 'Untitled', uuid, tags || []);
        app._noteRegistry[newNote.uuid] = newNote;
        return newNote.uuid; // app.createNote returns UUID
    })
    app.createNote = mockCreateNote;

    const mockNotesCreate = sinon.stub();
    mockNotesCreate.callsFake((title, tags, content, uuid) => {
        if (!uuid) uuid = nanoid();
        const newNote = mockNote(content || '', title || 'Untitled', uuid, tags || []);
        app._noteRegistry[newNote.uuid] = newNote;
        return newNote; // app.notes.create returns note interface
    })
    app.notes.create = mockNotesCreate;

    const mockSetSetting = sinon.stub();
    mockSetSetting.callsFake(async (key, value) => {
        app.settings[key] = value;
        return true;
    });
    app.setSetting = mockSetSetting;

    const mockGetSetting = sinon.stub();
    mockGetSetting.callsFake(key => {
        return app.settings[key] || null;
    });
    app.getSetting = mockGetSetting;

    const mockNavigate = sinon.stub();
    mockNavigate.callsFake(url => {
        const noteUrlPattern = /https:\/\/www\.amplenote\.com\/notes\/([a-f0-9\-]+)/;
        const match = url.match(noteUrlPattern);
        if (match) {
            const noteUUID = match[1];
            if (app._noteRegistry[noteUUID]) {
                app.context.noteUUID = noteUUID;
                return true;
            }
            return false;
        }
    });
    app.navigate = mockNavigate;

    const mockGetNoteImages = sinon.stub();
    mockGetNoteImages.callsFake(async (noteHandle) => {
        const note = notesFindFunction(noteHandle);
        if (!note) return [];
        return await note.images();
    });
    app.getNoteImages = mockGetNoteImages;

    const mockGetTask = sinon.stub();
    mockGetTask.callsFake(async (taskUUID) => {
        for (const note of Object.values(app._noteRegistry)) {
            const tasks = await note.tasks();
            const task = tasks.find(task => task.taskUUID === taskUUID);
            if (task) return task;
        }
        return null;
    });
    app.getTask = mockGetTask;

    const mockInsertTask = sinon.stub();
    mockInsertTask.callsFake(async (noteHandle, taskObject) => {
        const note = app.findNote(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.insertTask(taskObject.content, taskObject);
    });
    app.insertTask = mockInsertTask;

    const mockRemoveNoteTag = sinon.stub();
    mockRemoveNoteTag.callsFake(async (noteHandle, tag) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.removeTag(tag);
    });
    app.removeNoteTag = mockRemoveNoteTag;

    const mockAddNoteTag = sinon.stub();
    mockAddNoteTag.callsFake(async (noteHandle, tag) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.addTag(tag);
    });
    app.addNoteTag = mockAddNoteTag;

    const mockSetNoteName = sinon.stub();
    mockSetNoteName.callsFake(async (noteHandle, name) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.setName(name);
    });
    app.setNoteName = mockSetNoteName;

    const mockReplaceNoteContent = sinon.stub();
    mockReplaceNoteContent.callsFake(async (noteHandle, newContent, sectionObject = null) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.replaceContent(newContent, sectionObject);
    });
    app.replaceNoteContent = mockReplaceNoteContent;

    const mockInsertNoteContent = sinon.stub();
    mockInsertNoteContent.callsFake(async (noteHandle, content, options = {}) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.insertContent(content, options);
    });
    app.insertNoteContent = mockInsertNoteContent;

    const mockDeleteNote = sinon.stub();
    mockDeleteNote.callsFake(async (noteHandle) => {
        const noteHandleObj = appFindNote(noteHandle);
        if (noteHandleObj) {
            delete app._noteRegistry[noteHandleObj.uuid];
            return true;
        }
        return false;
    });
    app.deleteNote = mockDeleteNote;

    // Add getTask method to notes object
    app.notes.getTask = mockGetTask;

    // Add missing app methods
    const mockGetNoteSections = sinon.stub();
    mockGetNoteSections.callsFake(async (noteHandle) => {
        const note = notesFindFunction(noteHandle);
        if (!note) return [];
        return await note.sections();
    });
    app.getNoteSections = mockGetNoteSections;

    const mockGetNoteTasks = sinon.stub();
    mockGetNoteTasks.callsFake(async (noteHandle) => {
        const note = notesFindFunction(noteHandle);
        if (!note) return [];
        return await note.tasks();
    });
    app.getNoteTasks = mockGetNoteTasks;

    const mockGetNoteURL = sinon.stub();
    mockGetNoteURL.callsFake(async (noteHandle) => {
        const noteHandleObj = appFindNote(noteHandle);
        if (!noteHandleObj) return null;
        return `https://www.amplenote.com/notes/${noteHandleObj.uuid}`;
    });
    app.getNoteURL = mockGetNoteURL;

    const mockUpdateNoteImage = sinon.stub();
    mockUpdateNoteImage.callsFake(async (noteHandle, image, updates) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.updateImage(image, updates);
    });
    app.updateNoteImage = mockUpdateNoteImage;

    const mockUpdateTask = sinon.stub();
    mockUpdateTask.callsFake(async (taskUUID, updates) => {
        if (typeof taskUUID !== 'string') {
            throw new Error('updateTask: taskUUID must be a string');
        }
        if (!updates || typeof updates !== 'object') {
            throw new Error('updateTask: updates must be an object');
        }

        // Validate timestamp fields
        const timestampFields = ['dismissedAt', 'deadline', 'completedAt', 'endAt', 'startAt', 'hideUntil'];
        for (const field of timestampFields) {
            if (updates[field] !== undefined && updates[field] !== null) {
                if (!Number.isInteger(updates[field])) {
                    throw new Error(`updateTask: ${field} must be an integer timestamp`);
                }
            }
        }

        // Find the task across all notes
        for (const note of Object.values(app._noteRegistry)) {
            const taskRegex = /- \[([ x])\] ([^<]+)<!-- (\{[^}]*\}) -->/g;
            let match;
            let updatedContent = note._content;
            let taskFound = false;

            while ((match = taskRegex.exec(note._content)) !== null) {
                const metadataStr = match[3];
                let metadata = {};
                try {
                    metadata = JSON.parse(metadataStr);
                } catch (e) {
                    continue;
                }

                if (metadata.uuid === taskUUID) {
                    taskFound = true;
                    let newTaskLine = match[0];

                    // Update completion status
                    if (updates.completedAt !== undefined) {
                        const isCompleted = updates.completedAt !== null;
                        newTaskLine = newTaskLine.replace(/- \[([ x])\]/, `- [${isCompleted ? 'x' : ' '}]`);
                    }

                    // Update task content text
                    if (updates.content !== undefined) {
                        const currentContent = match[2].trim();
                        newTaskLine = newTaskLine.replace(currentContent, updates.content);
                    }

                    // Update metadata
                    Object.assign(metadata, updates);
                    newTaskLine = newTaskLine.replace(/<!-- \{[^}]*\} -->/, `<!-- ${JSON.stringify(metadata)} -->`);

                    updatedContent = updatedContent.replace(match[0], newTaskLine);
                    break;
                }
            }

            if (taskFound) {
                note._content = updatedContent;
                note.updated = new Date();
                return true;
            }
        }

        throw new Error(`Task not found: ${taskUUID}`);
    });
    app.updateTask = mockUpdateTask;

    // Handle insertTask with both content and text properties
    app.insertTask = sinon.stub();
    app.insertTask.callsFake(async (noteHandle, taskObject) => {
        const note = notesFindFunction(noteHandle);
        if (!note) throw new Error(`Note not found: ${noteHandle}`);
        return await note.insertTask(taskObject);
    });

    return app;
}

// --------------------------------------------------------------------------------------
/**
 * Creates a mock Amplenote note object
 *
 * @param {string} content - The initial content of the note
 * @param {string} name - The name/title of the note
 * @param {string} uuid - Unique identifier for the note
 * @param {string[]} [tags] - Array of tags associated with the note
 * @returns {Object} Mock note object with all Amplenote note API methods
 *
 */
export const mockNote = (content, name, uuid, tags) => {
    const note = {};
    note._content = content;
    note.name = name;
    note.uuid = uuid;
    note.tags = tags || [];
    note.content = () => note._content;
    note.created = new Date();
    note.updated = new Date();


    // --------------------------------------------------------------------------------------
    note.insertContent = async (newContent, options = {}) => {
        if (typeof newContent !== 'string') {
            throw new Error('insertContent: newContent must be a string');
        }
        if (options && typeof options !== 'object') {
            throw new Error('insertContent: options must be an object');
        }

        if (options.atEnd) {
            note._content += newContent;
        } else {
            note._content = `${newContent}${note._content}`;
        }
        note.updated = new Date();
    }

    // --------------------------------------------------------------------------------------
    note.replaceContent = async (newContent, sectionObject = null) => {
        if (typeof newContent !== 'string') {
            throw new Error('replaceContent: newContent must be a string');
        }
        if (sectionObject && typeof sectionObject !== 'object') {
            throw new Error('replaceContent: sectionObject must be an object');
        }

        if (sectionObject) {
            const sectionHeadingText = sectionObject.section.heading.text;
            let throughLevel = sectionObject.section.heading?.level;
            if (!throughLevel) throughLevel = sectionHeadingText.match(/^#*/)[0].length;
            if (!throughLevel) throughLevel = 1;

            const indexes = Array.from(note._content.matchAll(/^#+\s*([^#\n\r]+)/gm));
            const sectionMatch = indexes.find(m => m[1].trim() === sectionHeadingText.trim());
            let startIndex, endIndex;
            if (!sectionMatch) {
                throw new Error(`Could not find section ${sectionHeadingText} that was looked up. This might be expected`);
            } else {
                const level = sectionMatch[0].match(/^#+/)[0].length;
                const nextMatch = indexes.find(m => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
                endIndex = nextMatch ? nextMatch.index : note._content.length;
                startIndex = sectionMatch.index + sectionMatch[0].length + 1;
            }

            if (Number.isInteger(startIndex)) {
                note._content = `${note._content.slice(0, startIndex)}${newContent.trim()}\n${note._content.slice(endIndex)}`;
            } else {
                throw new Error(`Could not find section ${sectionObject.section.heading.text} in note ${note.name}`);
            }
        } else {
            note._content = newContent;
        }
        note.updated = new Date();
        return true;
    };

    // --------------------------------------------------------------------------------------
    note.sections = async () => {
        const headingMatches = note._content.matchAll(/^(#+)\s*([^\n]+)/gm);
        return Array.from(headingMatches).map(match => ({
            anchor: match[2].replace(/\s/g, "_"),
            level: match[1].length,
            text: match[2],
        }));
    }

    note.addTag = async (tag) => {
        if (typeof tag !== 'string') {
            throw new Error('addTag: tag must be a string');
        }
        if (!note.tags.includes(tag)) {
            note.tags.push(tag);
            note.updated = new Date();
        }
        return true;
    };

    note.removeTag = async (tag) => {
        if (typeof tag !== 'string') {
            throw new Error('removeTag: tag must be a string');
        }
        const index = note.tags.indexOf(tag);
        if (index > -1) {
            note.tags.splice(index, 1);
            note.updated = new Date();
        }
        return true;
    };

    note.delete = async () => {
        note.deleted = true;
        return true;
    };

    note.images = async () => {
        // Parse images from markdown content
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images = [];
        let match;
        let index = 0;

        while ((match = imageRegex.exec(note._content)) !== null) {
            images.push({
                caption: match[1] || '',
                index: index,
                src: match[2],
                text: `OCR text for ${match[2]}`, // Mock OCR text
                width: 800 // Mock width
            });
            index++;
        }

        return images;
    };

    note.insertTask = async (taskObject) => {
        if (!taskObject || typeof taskObject !== 'object') {
            throw new Error('insertTask: taskObject must be an object');
        }
        if (!taskObject.content && !taskObject.text) {
            throw new Error('insertTask: taskObject must have content or text property');
        }

        const taskContent = taskObject.content || taskObject.text;
        if (typeof taskContent !== 'string') {
            throw new Error('insertTask: task content must be a string');
        }

        // Validate timestamp fields
        const timestampFields = ['dismissedAt', 'deadline', 'completedAt', 'endAt', 'startAt', 'hideUntil'];
        for (const field of timestampFields) {
            if (taskObject[field] !== undefined && taskObject[field] !== null) {
                if (!Number.isInteger(taskObject[field])) {
                    throw new Error(`insertTask: ${field} must be an integer timestamp`);
                }
            }
        }

        const taskUUID = nanoid();
        let taskMarkdown = `- [ ] ${taskContent}`;
        const metadata = { uuid: taskUUID };

        if (taskObject.hideUntil) metadata.hideUntil = taskObject.hideUntil;
        if (taskObject.startAt) metadata.startAt = taskObject.startAt;
        if (taskObject.deadline) metadata.deadline = taskObject.deadline;
        if (taskObject.endAt) metadata.endAt = taskObject.endAt;

        taskMarkdown += `<!-- ${JSON.stringify(metadata)} -->`;
        note._content = `${taskMarkdown}\n${note._content}`;
        note.updated = new Date();

        return taskUUID;
    };

    note.tasks = async () => {
        // Parse tasks from markdown content
        const taskRegex = /- \[([ x])\] ([^<]+)<!-- (\{[^}]*\}) -->/g;
        const tasks = [];
        let match;

        while ((match = taskRegex.exec(note._content)) !== null) {
            const isCompleted = match[1] === 'x';
            const content = match[2].trim();
            const metadataStr = match[3];

            let metadata = {};
            metadata = JSON.parse(metadataStr)

            tasks.push({
                completedAt: metadata.completedAt || (isCompleted ? Math.floor(Date.now() / 1000) : null),
                dismissedAt: metadata.dismissedAt || null,
                endAt: metadata.endAt || null,
                hideUntil: metadata.hideUntil || null,
                startAt: metadata.startAt || null,
                content: content,
                noteUUID: note.uuid,
                taskUUID: metadata.uuid,
                urgent: metadata.urgent || false,
                important: metadata.important || false,
                score: metadata.score || 2.4
            });
        }

        return tasks;
    };

    // Set note name
    note.setName = async (name) => {
        if (typeof name !== 'string') {
            throw new Error('setName: name must be a string');
        }
        note.name = name;
        note.updated = new Date();
        return true;
    };

    // Get note URL
    note.url = async () => {
        return `https://www.amplenote.com/notes/${note.uuid}`;
    };

    // Update image
    note.updateImage = async (image, updates) => {
        if (!image || typeof image !== 'object') {
            throw new Error('updateImage: image must be an object');
        }
        if (!updates || typeof updates !== 'object') {
            throw new Error('updateImage: updates must be an object');
        }

        const images = await note.images();
        const targetImage = images.find(img =>
            img.src === image.src &&
            (image.index === undefined || img.index === image.index)
        );

        if (!targetImage) {
            throw new Error('updateImage: image not found in note');
        }

        // Update the image in the content
        if (updates.caption !== undefined) {
            const oldImageRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${targetImage.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
            note._content = note._content.replace(oldImageRegex, `![${updates.caption}](${targetImage.src})`);
            note.updated = new Date();
        }

        return true;
    };

    return note;
}


