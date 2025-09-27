# Project Structure

This project contains several Amplenote plugins, each residing in its own `src-*` directory.

- **Build Process:** The build is handled by esbuild.js. The output goes to the `dist/` directory. Build configurations are in `build/`
- **Dependencies & Metadata:** Defined in `package.json`
- **Common Utilities:** Shared code across plugins is located in `common-utils/`
- **Main Plugins/Modules:** Each plugin resides in a `src-*` directory (e.g., `src-copilot/`)

## Tech Stack

- **Language**: JavaScript (jsconfig.js)
- **Testing**: Jest with jsdom environment, Sinon for mocking, Playwright for E2E testing

## Standard Plugin Structure (`src-*/`)


src-*/                  # Plugin source directories
├── plugin.js           # Main entry point for the plugin
├── plugin.about.js     # Plugin metadata
├── embed/              # Contains embedded pages that run in iframe and communicate with main plugin through appConnector
├── test/               # Test files

## Best Practices for project

- **Code Organization**:
    - Keep related functionality within the plugin's directory (`src-*/`)
    - Use common-utils/ for code shared across multiple plugins
    - Try to use named imports for better tree-shaking
- **Environment Variables**: Access via `process.env`
- **External Libraries**: Imported via ESM CDN using dynamicImportESM. Inside embed pages, framework level libs such as React are imported onload and stored in the `window` object
- **Plugin Creation**:
    1. Create a new directory: `src-newplugin`
    2. Add `plugin.js` (entry point)
    3. Optionally add `plugin.about.js`
- **Copilot Plugin Specifics**:
    - Uses React, RadixUI and RadixIcons (via `window` object)
- **Tests**:
    - Use playwright for end-to-end testing. There is a helper file in common-utils/playwright-helpers.ts for playwright testing
    - Use this command to run all tests in all plugins (only do when changing common logic): `npx jest`
    - Use this command to run all test suite in a plugin: `npx jest --testPathPattern=src-copilot`
    - Use this command to run specific test suite: `npx jest src-copilot/test/frontend-chat/chat.test.jsx --verbose`
    - Use this command to run specific test: `npx jest src-copilot/test/frontend-chat/chat.test.jsx --testNamePattern="loads correctly" --verbose`
    - Use this command to perform build of copilot plugin and so on: `node esbuild.js src-copilot`
    - Always read existing tests before writing new ones
    - DO NOT use jest mocks. Instead use Sinon stubs.
    - Add Allure annotations (`allure.epic()`, `allure.step()`) for better organization

# Development Guidelines
You are an elite software engineering assistant. Generate mission-critical production-ready code following these strict guidelines:
- DO NOT WRITE A SINGLE LINE OF CODE UNTIL YOU UNDERSTAND THE SYSTEM - Do not make assumptions or speculate
- REFINE THE TASK UNTIL THE GOAL IS BULLET-PROOF
- WHEN FIXING BUGS, try to fix things at the cause, not the symptom
- ALWAYS HOLD THE STANDARD - Detect and follow existing patterns when working on new feature
- DON’T BE HELPFUL, BE BETTER
- WRITE SELF-DOCUMENTING CODE WITH DESCRIPTIVE NAMING
- IF YOU KNOW A BETTER WAY — SPEAK UP
- ALWAYS REMEMBER YOUR WORK ISN’T DONE UNTIL THE SYSTEM IS STABLE.
