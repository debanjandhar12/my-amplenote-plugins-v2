import dotenv from "dotenv"
import sinon from "sinon"

dotenv.config();

// --------------------------------------------------------------------------------------
/**
 * Creates a mock plugin object with properly bound methods for testing.
 * This function ensures that plugin methods are correctly bound to the plugin context,
 * which is essential for proper plugin testing.
 * 
 * @param {Object} pluginObject - The plugin object to mock
 * @param {Object} [pluginObject.insertText] - Insert text commands
 * @param {Object} [pluginObject.noteOption] - Note-specific actions  
 * @param {Object} [pluginObject.replaceText] - Replace text commands
 * @returns {Object} Mocked plugin object with bound methods
 * 
 * @example
 * const plugin = mockPlugin({
 *   insertText: {
 *     "Insert Hello": {
 *       run: async (app) => "Hello World"
 *     }
 *   }
 * });
 */
export const mockPlugin = (pluginObject) => {
  const plugin = { ...pluginObject };
  if (plugin.insertText) {
    Object.entries(plugin.insertText).forEach(([key, fn]) => {
      plugin.insertText[key] = plugin.insertText[key].run?.bind(plugin) || plugin.insertText[key].bind(plugin); // .insertText
    });
  }
  if (plugin.noteOption) {
    Object.entries(plugin.noteOption).forEach(([key, fn]) => {
      plugin.noteOption[key] = plugin.noteOption[key].run?.bind(plugin) || plugin.noteOption[key].bind(plugin);
    });
  }

  if (plugin.replaceText) {
    Object.entries(plugin.replaceText).forEach(([key, fn]) => {
      plugin.replaceText[key] = plugin.replaceText[key].run?.bind(plugin) || plugin.replaceText[key].bind(plugin);
    });
  }

  return plugin;
}

// --------------------------------------------------------------------------------------
/**
 * Creates a comprehensive mock Amplenote app object using Sinon stubs.
 * This mock app provides all the essential Amplenote API methods with Sinon-based
 * mocking for cross-environment compatibility (Jest and browser contexts).
 * 
 * All mock functions are created using Sinon stubs, which work consistently
 * across Jest and browser testing environments, unlike Jest mocks.
 * 
 * Includes support for:
 * - Note management (create, find, filter, navigate)
 * - Task operations (get, insert)
 * - Tag management (add, remove)
 * - Image handling
 * - Current note context operations
 * 
 * @param {Object} [seedNote] - Optional note to seed the app's note registry
 * @param {string} seedNote.uuid - Unique identifier for the seed note
 * @param {string} seedNote.name - Name/title of the seed note
 * @param {string} seedNote.body - Content of the seed note
 * @param {string[]} [seedNote.tags] - Tags associated with the seed note
 * @returns {Object} Mock app object with Sinon stubs for all API methods
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
 * 
 * @example
 * // Browser environment usage (compiled with esbuild-test-helpers)
 * const mockCode = `
 *   import { mockApp } from './test-helpers.js';
 *   window.testApp = mockApp();
 *   window.testApp.createNote.resolves({ uuid: 'new-note' });
 * `;
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

  const noteFindFunction = sinon.stub();
  noteFindFunction.callsFake(noteHandle => {
    if (typeof noteHandle === "string") {
      return app._noteRegistry[noteHandle] || null;
    } else if (noteHandle && noteHandle.uuid) {
      return app._noteRegistry[noteHandle.uuid] || null;
    }
    return null;
  });
  const getContent = sinon.stub();
  getContent.callsFake(noteHandle => {
    const note = typeof noteHandle === 'string' ?
      app._noteRegistry[noteHandle] :
      app._noteRegistry[noteHandle?.uuid];
    return note ? note.body : null;
  });

  app.findNote = noteFindFunction;
  app.notes.find = noteFindFunction;
  app.getNoteContent = getContent;
  const mockFilterNotes = sinon.stub();
  mockFilterNotes.callsFake(params => {
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
      notes = notes.filter(note => note.body && note.body.includes(params.content));
    }
    return notes;
  })
  app.notes.filter = mockFilterNotes;
  app.filterNotes = mockFilterNotes;

  const mockCreateNote = sinon.stub();
  mockCreateNote.callsFake((title, tags, content, uuid) => {
    if (!uuid) uuid = _generateUUID();
    const newNote = mockNote(content || '', title || 'Untitled', uuid, tags || []);
    app._noteRegistry[newNote.uuid] = newNote;
    return newNote;
  })
  app.createNote = mockCreateNote;
  app.notes.create = mockCreateNote;

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
    const note = app.findNote(noteHandle);
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
    const note = app.findNote(noteHandle);
    if (!note) throw new Error(`Note not found: ${noteHandle}`);
    return await note.removeTag(tag);
  });
  app.removeNoteTag = mockRemoveNoteTag;

  const mockAddNoteTag = sinon.stub();
  mockAddNoteTag.callsFake(async (noteHandle, tag) => {
    const note = app.findNote(noteHandle);
    if (!note) throw new Error(`Note not found: ${noteHandle}`);
    return await note.addTag(tag);
  });
  app.addNoteTag = mockAddNoteTag;

  const mockSetNoteName = sinon.stub();
  mockSetNoteName.callsFake(async (noteHandle, name) => {
    const note = app.findNote(noteHandle);
    if (!note) throw new Error(`Note not found: ${noteHandle}`);
    return await note.setName(name);
  });
  app.setNoteName = mockSetNoteName;

  const mockReplaceNoteContent = sinon.stub();
  mockReplaceNoteContent.callsFake(async (noteHandle, newContent, sectionObject = null) => {
    const note = app.findNote(noteHandle);
    if (!note) throw new Error(`Note not found: ${noteHandle}`);
    return await note.replaceContent(newContent, sectionObject);
  });
  app.replaceNoteContent = mockReplaceNoteContent;

  const mockInsertNoteContent = sinon.stub();
  mockInsertNoteContent.callsFake(async (noteHandle, content, options = {}) => {
    const note = app.findNote(noteHandle);
    if (!note) throw new Error(`Note not found: ${noteHandle}`);
    return await note.insertContent(content, options);
  });
  app.insertNoteContent = mockInsertNoteContent;

  // Add getTask method to notes object
  app.notes.getTask = mockGetTask;

  return app;
}

// --------------------------------------------------------------------------------------
/**
 * Creates a mock Amplenote note object with all essential properties and methods.
 * This mock note provides a complete implementation of the Amplenote note API
 * for testing purposes, including content manipulation and section handling.
 * 
 * Includes support for:
 * - Content manipulation (insert, replace)
 * - Tag management (add, remove)
 * - Task operations (insert, list)
 * - Image handling
 * - Timestamps (created, updated)
 * - Note deletion
 * 
 * @param {string} content - The initial content/body of the note
 * @param {string} name - The name/title of the note
 * @param {string} uuid - Unique identifier for the note
 * @param {string[]} [tags] - Array of tags associated with the note
 * @returns {Object} Mock note object with all Amplenote note API methods
 * 
 * @example
 * // Create a basic mock note
 * const note = mockNote('# Test Note\nContent here', 'Test Note', 'test-uuid', ['tag1', 'tag2']);
 * 
 * // Use note methods
 * await note.insertContent('\nNew content');
 * await note.replaceContent('Replaced content');
 * const sections = await note.sections();
 * 
 * @example
 * // Browser environment usage
 * const mockCode = `
 *   import { mockNote } from './test-helpers.js';
 *   window.testNote = mockNote('Test content', 'Test', 'uuid');
 * `;
 */
export const mockNote = (content, name, uuid, tags) => {
  const note = {};
  note.body = content;
  note.name = name;
  note.uuid = uuid;
  note.tags = tags || [];
  note.content = () => note.body;
  note.created = new Date();
  note.updated = new Date();
  note.lastUpdated = new Date();


  // --------------------------------------------------------------------------------------
  note.insertContent = async (newContent, options = {}) => {
    if (options.atEnd) {
      note.body += newContent;
    } else {
      note.body = `${note.body}\n${newContent}`;
    }
    note.lastUpdated = new Date();
    note.updated = new Date();
  }

  // --------------------------------------------------------------------------------------
  note.replaceContent = async (newContent, sectionObject = null) => {
    _replaceNoteContent(note, newContent, sectionObject);
    note.lastUpdated = new Date();
    note.updated = new Date();
  };

  // --------------------------------------------------------------------------------------
  note.sections = async () => {
    const headingMatches = note.body.matchAll(/^(#+)\s*([^\n]+)/gm);
    return Array.from(headingMatches).map(match => ({
      anchor: match[2].replace(/\s/g, "_"),
      level: match[1].length,
      text: match[2],
    }));
  }

  note.addTag = async (tag) => {
    if (!note.tags.includes(tag)) {
      note.tags.push(tag);
      note.updated = new Date();
    }
    return true;
  };

  note.removeTag = async (tag) => {
    const index = note.tags.indexOf(tag);
    if (index > -1) {
      note.tags.splice(index, 1);
      note.updated = new Date();
    }
    return true;
  };

  note.delete = async () => {
    note._deleted = true;
    return true;
  };

  note.images = async () => {
    // Parse images from markdown content
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [];
    let match;
    let index = 0;

    while ((match = imageRegex.exec(note.body)) !== null) {
      images.push({
        caption: match[1] || '',
        captionindex: index,
        src: match[2],
        text: `OCR text for ${match[2]}`, // Mock OCR text
        width: 800 // Mock width
      });
      index++;
    }

    return images;
  };

  note.insertTask = async (taskContent, taskObject = {}) => {
    const taskUUID = _generateUUID();

    let taskMarkdown = `- [ ] ${taskContent}`;
    const metadata = { uuid: taskUUID };

    if (taskObject.hideUntil) metadata.hideUntil = taskObject.hideUntil;
    if (taskObject.startAt) metadata.startAt = taskObject.startAt;

    taskMarkdown += `<!-- ${JSON.stringify(metadata)} -->`;
    note.body += `\n${taskMarkdown}`;
    note.updated = new Date();

    return taskUUID;
  };

  note.tasks = async () => {
    // Parse tasks from markdown content
    const taskRegex = /- \[([ x])\] ([^<]+)<!-- \{"uuid":"([^"]+)"[^}]*\} -->/g;
    const tasks = [];
    let match;

    while ((match = taskRegex.exec(note.body)) !== null) {
      const isCompleted = match[1] === 'x';
      const content = match[2].trim();
      const taskUUID = match[3];

      tasks.push({
        completedAt: isCompleted ? new Date() : null,
        dismissedAt: null,
        endAt: null,
        hideUntil: null,
        startAt: null,
        content: content,
        noteUUID: note.uuid,
        taskUUID: taskUUID,
        urgent: false,
        important: false,
        score: 2.4
      });
    }

    return tasks;
  };

  // Set note name
  note.setName = async (name) => {
    note.name = name;
    note.updated = new Date();
    return true;
  };

  return note;
}

// --------------------------------------------------------------------------------------

/**
 * Internal helper function to replace note content, optionally within a specific section.
 * This function handles both full note content replacement and section-specific replacement
 * based on markdown heading structure.
 * 
 * @private
 * @param {Object} note - The note object to modify
 * @param {string} newContent - The new content to insert
 * @param {Object} [sectionObject] - Optional section specification for targeted replacement
 * @param {Object} sectionObject.section - Section details
 * @param {Object} sectionObject.section.heading - Heading information
 * @param {string} sectionObject.section.heading.text - The heading text to find
 * @param {number} [sectionObject.section.heading.level] - The heading level (1-6)
 * @throws {Error} When specified section cannot be found in the note
 * 
 * @example
 * // Replace entire note content
 * _replaceNoteContent(note, 'New content');
 * 
 * // Replace content within a specific section
 * _replaceNoteContent(note, 'New section content', {
 *   section: { heading: { text: 'My Section', level: 2 } }
 * });
 */
function _replaceNoteContent(note, newContent, sectionObject = null) {
  if (sectionObject) {
    const sectionHeadingText = sectionObject.section.heading.text;
    let throughLevel = sectionObject.section.heading?.level;
    if (!throughLevel) throughLevel = sectionHeadingText.match(/^#*/)[0].length;
    if (!throughLevel) throughLevel = 1;

    const indexes = Array.from(note.body.matchAll(/^#+\s*([^#\n\r]+)/gm));
    const sectionMatch = indexes.find(m => m[1].trim() === sectionHeadingText.trim());
    let startIndex, endIndex;
    if (!sectionMatch) {
      throw new Error(`Could not find section ${sectionHeadingText} that was looked up. This might be expected`);
    } else {
      const level = sectionMatch[0].match(/^#+/)[0].length;
      const nextMatch = indexes.find(m => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
      endIndex = nextMatch ? nextMatch.index : note.body.length;
      startIndex = sectionMatch.index + sectionMatch[0].length + 1;
    }

    if (Number.isInteger(startIndex)) {
      note.body = `${note.body.slice(0, startIndex)}${newContent.trim()}\n${note.body.slice(endIndex)}`;
    } else {
      throw new Error(`Could not find section ${sectionObject.section.heading.text} in note ${note.name}`);
    }
  } else {
    note.body = newContent;
  }
  note.lastUpdated = new Date();
  note.updated = new Date();
}

// --------------------------------------------------------------------------------------
/**
 * Generates a random UUID for testing purposes
 * @private
 * @returns {string} A UUID string
 */
function _generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
