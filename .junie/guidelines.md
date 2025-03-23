# Amplenote Plugins Development Guidelines

This document provides concise guidance for new developers working on the Amplenote plugins project.

## Project Overview

This is a development environment for multiple Amplenote plugins in a single workspace. The project contains several plugins.

## Project Structure

```
my-amplenote-plugins-v2/
├── build/                  # Build configuration and plugins
├── common-utils/           # Shared utilities across plugins
├── dist/                   # Build output
├── src-*/                  # Plugin source directories
│   ├── plugin.js           # Main entry point for the plugin
│   ├── plugin.about.js     # Plugin metadata
│   ├── embed/              # HTML files for embedded components
│   ├── frontend-*/         # Frontend components
│   ├── backend/            # Backend functionality
│   ├── test/               # Test files
│   └── utils/              # Plugin-specific utilities
```

## Tech Stack

- **Language**: JavaScript/TypeScript (ES Modules)
- **Build System**: esbuild
- **Testing**: Jest (with jsdom) and Playwright

## Plugin Development

### Creating a New Plugin

1. Create a new directory with the prefix `src-` (e.g., `src-myplugin`)
2. Create a `plugin.js` file as the main entry point
3. Optionally create a `plugin.about.js` file for metadata
4. Follow the structure of existing plugins for guidance

## Best Practices

1. **Code Organization**:
   - Keep related functionality in the same directory
   - Use the common-utils directory for shared code

2. **Development Workflow**:
   - Use the development server for rapid iteration
   - Check the console for errors and warnings

## Plugin Specific Guidelines

### Common
- Access environment variables through the process.env object
- Libraries are imported using esm cdn and stored usually stored in window object.

### Copilot Plugin
- UI Library: React, RadixUI (stored in window object)