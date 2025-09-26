# Copilot Development Guide

This document focuses on the Copilot plugin under `src-copilot/`. It explains how Copilot is put together and where to look when you need to extend it.

Video walkthrough of codebase: [https://www.youtube.com/watch?v=9vVB6Bohc0k](https://www.youtube.com/watch?v=9vVB6Bohc0k)

## Architecture

### Chat UI

- Embed entry point: `src-copilot/embed/chat.jsx`
  - Loads UI frameworks from a single external bundle via `dynamicImportExternalPluginBundle('assistantUIBundle.js')` and attaches them to `window` (React, Radix UI, Assistant UI, etc.). This avoids multiple-React-instance issues inside the iframe.
  - Sets up a plugin.js proxy: `window.appConnector = new Proxy(..., { get: () => async (...args) => window.callAmplenotePlugin(prop, ...args) })` so in-embed code can call the host uniformly. During development/tests, `window.callAmplenotePlugin` is a mock created by `createCallAmplenotePluginMock`.
  - Emits an `appLoaded` event at the end of boot to help tests know when the UI is ready.

- Tool framework (tools allows copilot to modify user notes and tasks): 
  - Create new tools using the generic factories: Use `tools-core/base/createGenericCUDTool.jsx` for create/update/delete operations, or `tools-core/base/createGenericReadTool.jsx` for read-only queries. Implement the provided hooks (`onInit`, `render...`, and for CUD also `onSubmitted`) and then register the tool (see Registry below).
  - Registry (add new tools and enable): A tool must be registered and its group enabled for the session before the LLM can invoke it. After creating new tool, you need to register it in `tools-core/registry/ToolRegistry.js` and group them in `ToolGroupRegistry.js` (e.g., notes, tasks).
  - Lifecycle (state machine): `The tools follows a lifecycle-based architecture defined in (`tools-core/base/createGenericCUDTool.jsx` / `tools-core/base/createGenericReadTool.jsx`) plus `hooks/useGenericToolFormState.jsx`. Lifecycle for write tools: `booting → init → waitingForUserInput → submitted → completed` (with `error`/`canceled` exits). 
    - Lifecycle: CUD tools (create/update/delete): `booting → init → waitingForUserInput → submitted → completed` (with `error`/`canceled` exits). In init the tool gathers data; in waitingForUserInput it renders a review UI and performs no writes; on submitted it executes writes inside `onSubmitted`; completed shows success; canceled/error halts and clears any staged follow-ups.
    - Lifecycle: Read tools (read-only): `booting → init → completed` (with `error` exit). The tool prepares and runs in init (showing a processing UI), then renders results in completed. There is no submit/cancel phase because nothing is modified.
  - Safeguards (with confirmation UI): Before modifying user notes & tasks, the tool shows diffs/selection for user to review and surfaces Submit/Cancel. This enforces human-in-the-loop confirmation and prevents unintended edits/deletions.

- System prompt: `frontend-chat/helpers/getSystemMessage.js`

### Search UI

- Embed entry point: `src-copilot/embed/search.jsx`
  - Loads UI frameworks from a single external bundle via `dynamicImportExternalPluginBundle('searchUIBundle.js')` and attaches them to `window` (React, Radix, Icons, Viruoso list).
  - Sets up the `appConnector` proxy similar to Chat, fetches settings, and renders `frontend-search/SearchApp.jsx`.
  - Emits `appLoaded` at the end of boot.

- How Search calls the plugin and DB
  - The Amplenote host invokes `src-copilot/plugin.js`. From menu options (e.g., “Search notes using natural language”), the plugin opens the Search embed (`renderEmbed` returns `embed/search.html`).
  - The embed calls plugin methods via `appConnector`, notably `searchNotesInCopilotDB` (see `plugin.js:onEmbedCall`). Those delegate to CopilotDB APIs.

### CopilotDB

- Location: `src-copilot/CopilotDB/`
  - DuckDB (WASM) layer: `DuckDB/` (e.g., `DuckDBNotesManager.js`, `DuckDBConnectionController.js`) manages note records. RRF (Reciprocal Rank Fusion) is used to fuse signals (e.g., lexical + vector relevance) to return robust note rankings.
  - Embeddings: `embeddings/` provides `EmbeddingGeneratorFactory` to create embeddings for queries/content.

## Test Suite

Tests are under `src-copilot/test/` and use Jest with Sinon mocking, Playwright for UI testing, and Allure for comprehensive reporting.

### Frontend Chat Tests (`frontend-chat/`)

- **`chat.test.jsx`** - Core chat embed functionality
  - Loads the Chat embed with mocked host/settings
  - Verifies boot sequence, basic LLM interaction paths, and error handling
  - Tests empty settings scenarios and UI state management

- **`provider.test.jsx`** - LLM Provider Integration
  - Validates all supported LLM providers (OpenAI, Anthropic, Groq, Fireworks, Google)
  - Tests provider-specific configuration and API interactions
  - Ensures consistent behavior across different AI models

- **`userprompt.test.jsx`** - Custom Prompt Handling
  - Tests user custom prompt injection and processing
  - Validates prompt template rendering and variable substitution
  - Ensures proper prompt sanitization and security

- **`tools/` Directory** - Tool System Tests
  - **`CreateNewNotes.test.js`** - Note creation tool with user confirmation UI
  - **`DeleteUserNotes.test.js`** - Note deletion with safety confirmations
  - **`EditNoteContent.test.js`** - Content editing with diff preview
  - **`UpdateUserNotes.test.js`** - Note metadata updates (tags, titles)
  - **`InsertTasksToNote.test.js`** - Task insertion with scheduling options
  - **`UpdateUserTasks.test.js`** - Task modification and completion
  - **`FetchNoteDetailByNoteUUID.test.js`** - Note retrieval and display
  - **`SearchHelpCenter.test.js`** - Help center search integration
  - **`WebBrowser.test.js`** - Web browsing tool functionality
  - **`WebSearch.test.js`** - Web search integration
  
  All tool tests confirm state-based execution lifecycle and require explicit user confirmation for write operations, preventing unintended edits or deletions. Tests ensure user notes and tasks are correctly updated by verifying state changes in `mockApp()` and `mockNote()`.

- **`components/` Directory** - UI Component Tests
  - **`makeCustomMarkdownText.test.js`** - Markdown rendering and customization

- **`helpers/` Directory** - Utility Function Tests
  - **`truncateObjectVal.test.js`** - Object value truncation for display

### Frontend Search Tests (`frontend-search/`)

- **`search.test.jsx`** - Search embed functionality
  - Tests natural language search interface
  - Validates search result rendering and interaction
  - Ensures proper integration with CopilotDB search APIs

### CopilotDB Tests (`CopilotDB/`)

- **`embeddings/` Directory** - Embedding Provider Tests
  - **`OpenAIEmbeddingGenerator.test.js`** - OpenAI embedding generation
  - **`GoogleEmbeddingGenerator.test.js`** - Google embedding integration
  - **`FireworksEmbeddingGenerator.test.js`** - Fireworks AI embeddings
  - **`PineconeEmbeddingGenerator.test.js`** - Pinecone vector database integration
  
  Tests validate embedding generation, vector storage, and retrieval accuracy.

- **`splitter/` Directory** - Content Processing Tests
  - **`Splitter.test.js`** - Note content splitting into chunks suitable for embedding and search
  - Tests chunk size optimization, overlap handling, and semantic boundary preservation

### Plugin Integration Tests

- **`plugin.test.js`** - Core plugin functionality
  - Tests plugin initialization and configuration
  - Validates embed rendering and communication
  - Ensures proper integration with Amplenote APIs


For detailed testing commands and patterns, see the root `DEVELOPMENT.md` Testing section.