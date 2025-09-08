# Development Guide

This repository contains multiple Amplenote plugins developed in a shared mono-repo. It includes shared utilities, build tooling, and an end-to-end test harness. This document explains the folder structure, how to build any plugin, how embeds load external libraries, how the dev environment works, and how to write and run tests.

## Repository Structure

```
.
├── build/                     # esbuild plugins & jest transformers
├── common-utils/              # Shared utilities used by multiple plugins
├── src-*/                     # Each plugin implementation in its own folder (e.g., src-copilot, src-charts)
├── _myAmplePluginExternal/    # External ESM bundles for embeds (React, Radix, etc.)
├── docs/                      # Additional docs
├── coverage/                  # Test coverage output
├── esbuild.js                 # Build script (targets a single plugin folder)
├── jest.config.js             # Jest configuration (jsdom + Playwright helpers)
├── jest.setup.js              # Jest setup (globals, polyfills)
├── package.json               # Dependencies, scripts
├── jsconfig.json              # JS tooling config
└── .env.example               # Sample environment variables
```

Each plugin under `src-*/` follows:

```
src-*/
├── plugin.js           # Plugin entry point
├── plugin.about.js     # Plugin metadata (optional)
├── embed/              # Iframe UI (React/HTML) that talks to plugin.js via appConnector
├── test/               # Tests for this plugin
└── (other subfolders per plugin)
```

Shared code used across plugins (dynamic imports, test helpers, utilities) lives in `common-utils/`.

## Build and Local Development (any plugin)

There are two ways to target a specific plugin folder: via one-off CLI or via the npm scripts.

- One-off CLI (no edits required):
  - `node esbuild.js $(pwd)/src-charts`
  - `node esbuild.js $(pwd)/src-bigmoji`
  - `node esbuild.js $(pwd)/src-copilot`
  - Watch and serve: `node esbuild.js $(pwd)/src-charts --watch --server`

- Using npm scripts (recommended):
  1) Open `package.json` and replace the absolute path used by the scripts with your target plugin. For example, change:
     - `"build:prod": "NODE_ENV=production node esbuild.js $(pwd)/src-copilot"`
     - `"build:dev": "node esbuild.js $(pwd)/src-copilot --watch --server"`
     to point to your plugin, e.g. `$(pwd)/src-charts` or `$(pwd)/src-bigmoji`.
     <img width="658" height="180" alt="image" src="https://github.com/user-attachments/assets/114715d7-2a51-4bc9-a1c4-1663a3fa9c74" />
  2) Then run:
     - Production build: `npm run build:prod`
     - Dev/watch and serve: `npm run build:dev`

What the build does:
- Uses `esbuild` to bundle `plugin.js`, any `embed/*.html` pages, and `plugin.about.js` when present (see `esbuild.js` and `build/esbuild-options.js`).
- Writes bundles into `dist/`.

## Dev Environment for Embed Plugins

Embed pages are standalone HTML + JS apps loaded in an iframe by Amplenote. For local iteration, the `--server` mode above lets you open the compiled embed in a normal browser. Typical flow inside an embed entry (e.g., `src-charts/embed/chart.js`, `src-bigmoji/embed/emoji.jsx`, `src-copilot/embed/chat.jsx`):

- A plugin.js call proxy is created:
  - `window.appConnector = new Proxy({}, { get: (...) => async (...args) => window.callAmplenotePlugin(prop, ...args) });`
  - The embed calls `appConnector.<method>(...)` which is forwarded to plugin.js running inside amplenote via `callAmplenotePlugin`.
  - During embed local dev or tests, plugin.js needs to be mocked using `createCallAmplenotePluginMock` from `common-utils/embed-comunication.js`.
- Embeds may optionally emit custom events like `appLoaded` (used by some tests). This pattern is common in Copilot Chat/Search embeds (`src-copilot/embed/chat.jsx`, `src-copilot/embed/search.jsx`). Other plugins often rely on DOM readiness/selectors instead of events.
- UI style/loader helpers are available in `common-utils/embed-ui.js` (e.g., `showEmbedLoader()`, `hideEmbedLoader()`).

## External Libraries in Embeds

To avoid multiple React instance errors across iframes and embedded pages, we load framework-level libraries (React, Radix UI, Assistant UI, etc.) from a single external bundle and attach them to `window`. This ensures one React/DOM stack instance and prevents hooks/context mismatches.

- Load a pre-built bundle once and attach globals
  - Function: `dynamicImportExternalPluginBundle(fileName)` from `common-utils/dynamic-import-esm.js`.
  - Example (Chat embed): `src-copilot/embed/chat.jsx`
    - `const [React, ReactDOM, AssistantUI, RadixUI, AssistantUIMarkdown, RadixIcons, StringDiff, dayjs, tributejs, ReactErrorBoundary, AssistantUIUtils] = await dynamicImportExternalPluginBundle('assistantUIBundle.js');`
    - Then: `window.React = React; window.ReactDOM = ReactDOM; ...`
  - Example (Search embed): `src-copilot/embed/search.jsx` uses `searchUIBundle.js` similarly.

- Load individual packages (non-React or small libs) only when necessary
  - Functions: `dynamicImportESM(pkg, version?)`, `dynamicImportCSS(pkg, version?)` from `common-utils/dynamic-import-esm.js`.
  - Use these for stylesheets or small ESM packages that are safe to load independently.

Rule of thumb:
- Prefer the external bundle for React-based UI frameworks to guarantee a single React instance.
- External bundles need to be published manually after creating new bundles or package version upgrade (`node ./_myAmplePluginExternal/publish.cjs`). The bundle having package version different from main package.json will throw error.
- Use `dynamicImportESM`/`dynamicImportCSS` for utility libraries or styles not included in the external bundle.

## Environment Variables

- Use `.env` (see `.env.example`) for settings consumed by local build/tests.

## Testing Overview

We use Jest (jsdom) together with Playwright to drive in-embed UI scenarios.

- Run all tests:
  - `npm test`
- Watch mode:
  - `npm run test:watch`

Patterns for writing embed tests:
- Use `inline:` imports to include embed HTML in tests (see examples under `src-*/test` folders).
- Use `addScriptToHtmlString` from `common-utils/embed-helpers.js` to inject a `<script>` block that defines variables that may come from plugin.js
- Boot a Playwright page using `createPlaywrightHooks()` from `common-utils/playwright-helpers.ts` and call `page.setContent(htmlWithMocks)`.
- Interact with the UI using selectors and assertions. Some embeds (Copilot Chat/Search, Speech) also emit custom events like `appLoaded`.
- It is possible to create plugins without embed pages (just skip creating the embed folder).