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
  const plugin = { ... pluginObject };
  if (plugin.insertText) {
    Object.entries(plugin.insertText).forEach(([ key, fn ]) => {
      plugin.insertText[key] = plugin.insertText[key].run?.bind(plugin) || plugin.insertText[key].bind(plugin); // .insertText
    });
  }
  if (plugin.noteOption) {
    Object.entries(plugin.noteOption).forEach(([ key, fn ]) => {
      plugin.noteOption[key] = plugin.noteOption[key].run?.bind(plugin) || plugin.noteOption[key].bind(plugin);
    });
  }

  if (plugin.replaceText) {
    Object.entries(plugin.replaceText).forEach(([ key, fn ]) => {
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
  app.context.noteUUID = "abc123";
  app.createNote = sinon.stub();
  app.getNoteContent = sinon.stub();
  app.prompt = sinon.stub();
  app.navigate = sinon.stub();
  app.notes = {};
  app.notes.find = sinon.stub().resolves(null);
  app.notes.filter = sinon.stub().resolves([]);
  app.notes.create= sinon.stub();
  app.filterNotes = sinon.stub().resolves([]);
  app.getNoteImages = sinon.stub().resolves([]);
  app.settings = {};
  app._noteRegistry = {};

  if (seedNote) {
    app._noteRegistry[seedNote.uuid] = seedNote;
  }

  const noteFunction = sinon.stub();
  noteFunction.callsFake(noteHandle => {
    if (typeof noteHandle === "string") {
      return app._noteRegistry[noteHandle];
    } else if (typeof noteHandle === "number") {
      return null;
    } else if (noteHandle.uuid) {
      return app._noteRegistry[noteHandle.uuid];
    } else if (noteHandle.name && noteHandle.tag) {
      return Object.values(app._noteRegistry).filter(
          note => note.name === noteHandle.name && note.tags.includes(noteHandle.tag)
      )[0];
    }

  });
  const getContent = sinon.stub();
  getContent.callsFake(noteHandle => {
    return app._noteRegistry[noteHandle.uuid].body;
  });

  app.findNote = noteFunction;
  app.notes.find = noteFunction;
  app.getNoteContent = getContent;
  const mockFilterNotes = sinon.stub();
  mockFilterNotes.callsFake(params => {
    const tag = params.tag;
    return Object.values(app._noteRegistry).filter(note => {
      if (!note.tags) return false;
      for (const noteTag of note.tags) {
        if (noteTag.includes(tag)) return true;
      }
      return false;
    });
  })
  app.notes.filter = mockFilterNotes;
  app.filterNotes = mockFilterNotes;

  const mockCreateNote = sinon.stub();
  mockCreateNote.callsFake((title, tags, content, uuid) => {
    if (!uuid) uuid = String(Object.keys(app._noteRegistry).length + 1);
    const newNote = mockNote(content, title, uuid, tags);
    app._noteRegistry[newNote.uuid] = newNote;
    return newNote;
  })
  app.createNote = mockCreateNote;
  app.notes.create = mockCreateNote;

  const mockSetSetting = sinon.stub();
    mockSetSetting.callsFake(async (key, value) => {
      app.settings[key] = value;
  });
  app.setSetting = mockSetSetting;

  app.replaceNoteContent = async (note, newContent, sectionObject = null) => {
    note = app.findNote(note) || note;
    _replaceNoteContent(note, newContent, sectionObject);
  };

  return app;
}

// --------------------------------------------------------------------------------------
/**
 * Creates a mock Amplenote note object with all essential properties and methods.
 * This mock note provides a complete implementation of the Amplenote note API
 * for testing purposes, including content manipulation and section handling.
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
  note.tags = tags;
  note.content = () => note.body;
  note.lastUpdated = new Date();

  // --------------------------------------------------------------------------------------
  note.insertContent = async (newContent, options = {}) => {
    if (options.atEnd) {
      note.body += newContent;
    } else {
      note.body = `${ note.body }\n${ newContent }`;
    }
    note.lastUpdated = new Date();
  }

  // --------------------------------------------------------------------------------------
  note.replaceContent = async (newContent, sectionObject = null) => {
    _replaceNoteContent(note, newContent, sectionObject);
    note.lastUpdated = new Date();
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
      throw new Error(`Could not find section ${ sectionHeadingText } that was looked up. This might be expected`);
    } else {
      const level = sectionMatch[0].match(/^#+/)[0].length;
      const nextMatch = indexes.find(m => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
      endIndex = nextMatch ? nextMatch.index : note.body.length;
      startIndex = sectionMatch.index + sectionMatch[0].length + 1;
    }

    if (Number.isInteger(startIndex)) {
      note.body = `${note.body.slice(0, startIndex)}${newContent.trim()}\n${note.body.slice(endIndex)}`;
    } else {
      throw new Error(`Could not find section ${ sectionObject.section.heading.text } in note ${ note.name }`);
    }
  } else {
    note.body = newContent;
  }
  note.lastUpdated = new Date();
}
