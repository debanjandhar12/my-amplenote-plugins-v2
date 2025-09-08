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

Tests are under `src-copilot/test/`.

- `frontend-chat/chat.test.jsx`
  - Loads the Chat embed with mocked host/settings. Verifies boot, basic LLM path, and error handling.

- `frontend-chat/provider.test.jsx`
  - Checks all supported LLM providers are working correctly.

- `frontend-chat/userprompt.test.jsx`
  - Checks user custom prompt handling is working correctly.

- `frontend-chat/tools/`
  - End-to-end tests for tool behavior (e.g., CreateNewNotes, DeleteUserNotes, InsertTasksToNote, EditNoteContent). These confirm state-based execution and require explicit user confirmation for any write, preventing unintended edits or deletions.

- Embedding provider tests
  - `CopilotDB/embeddings/` — Checks embedding generators/providers.
  - `CopilotDB/splitter/` — Checks note splitting into chunks suitable for embedding and search.

For how to run tests and generate coverage, see the root `DEVELOPMENT.md` Testing section.