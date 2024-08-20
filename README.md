# Amplenote Plugin Template

This is a template / dev env for my Amplenote plugins (heavily customized). It is meant to host all of my amplenote plugins in a single workspace. However, if you wish to fork this repo and use it for your own plugins, feel free to do so.

Current plugin list:
- [x] Amplenote Omnivore Plugin
- [x] Amplenote Charts Plugin 
- [x] Amplenote Mindmap Plugin
- [x] Amplenote Text2Dia Plugin
- [x] Amplenote Autolink Plugin

# Building, Testing, and Running Plugins

## Setup
1. Install dependencies:
   ```
   npm install
   ```
2. Set the target folder in `package.json` to specify the plugin you want to work with. For example:

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
- Run Jest tests:
  ```
  npm run test
  ```
- Run tests in watch mode:
  ```
  npm run test:watch
  ```

Note: If you encounter a jsdom error, install it with:
```
npm install -D jest-environment-jsdom
```

## Development Environment Features

#### 1. HTML Embedding Support
- When running `npm run dev`, HTML files in the target folder's `embed` directory are built and served at `http://localhost:3000/`. This allows testing embed pages in isolation.
- The build command can import these HTML files as strings in your `plugin.js`. Then, you can return them inside your renderEmbed function.

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