# Amplenote Plugin Template

This is a template / dev env for my Amplenote plugins (heavily customized). It is meant to host all of my amplenote plugins in a single workspace. However, if you wish to fork this repo and use it for your own plugins, feel free to do so.

Current plugin list:
- [x] Amplenote Omnivore Plugin
- [x] Amplenote Charts Plugin 
- [x] Amplenote Mindmap Plugin
- [x] Amplenote Text2Dia Plugin
- [x] Amplenote Autolink Plugin
- [x] Amplenote Bigmoji Plugin
- [x] Amplenote Copilot Plugin

# Building, Testing, and Running Plugins

## Setup
1. Install dependencies:
   ```
   npm install
   ```
2. Set the target folder in `package.json` to specify the plugin you want to work with. This needs to be done before running build or tests. For example:

   ![Package.json configuration](https://github.com/debanjandhar12/my-amplenote-plugins-v2/assets/49021233/2f123d9b-d195-4dfd-9a00-f62bccf715b5)

   The target folder must contain a `plugin.js` file as the entry point.

## Building
- For production:
  ```
  npm run build:prod
  ```
- For development (with watch mode):
  ```
  npm run build:dev
  ```

## Testing
This development template comes with several utilities to support testing. Unit tests run in jsdom, and end-to-end tests run in Playwright—both powered by Jest test-runner.Common testing helpers are available in the common-utils folder to simplify writing test cases.
- Run tests:
  ```
  npm run test
  ```
- Run tests in watch mode:
  ```
  npm run test:watch
  ```

> Note: If you run into errors with jsdom or Playwright, ensure both are installed:
> ```
> npm install -D jest-environment-jsdom
> npx playwright install chromium
> ```

## Development Environment Features

#### 1. HTML Embedding Support
- When running `npm run dev`, HTML files in the target folder's `embed` directory are built and served at `http://localhost:3000/`. This allows testing embed pages in isolation. ([Video](https://www.youtube.com/watch?v=9vVB6Bohc0k&t=49s))
- The build command can import these HTML files as strings in your `plugin.js`. Then, you can return them inside your renderEmbed function.
  ```
  import chatHTML from 'inline:./embed/chat.html';
  const plugin = {
    renderEmbed: async function (app) {
        return chatHTML;
    }
  }
  export default plugin;
  ```

#### 2. Automatic Plugin Page Markdown Generation
- Running `npm run build` will auto-generate plugin page markdown if the target folder contains a `plugin.about.js` file with the following structure:
  ```javascript
  export default {
    name: 'Amplenote Omnivore Plugin',
    description: 'A plugin to sync Amplenote with omnivore',
    icon: 'sync_alt',
    instructions: `
      1. Install the plugin.
      2. Go to the plugin settings and configure the settings.
      3. Enjoy!
    `,
    settings: ["Setting 1", "Setting 2"],
    version: '1.0.0',
    body: `
      # Amplenote Omnivore Plugin

      This plugin syncs Amplenote with omnivore.
    `
  };
  ```


# Contributing to Code
Pull requests to improve the plugins are welcome. For an overview of the code structure, see:
- Development Guide: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Copilot Development Guide: [DEVELOPMENT_COPILOT.md](./DEVELOPMENT_COPILOT.md)