# ESBuild Test Helpers

This module provides utilities for compiling JavaScript code with imports for use in browser-based tests, replacing the need for template literal injection and `serializeWithFunctions`.

## Functions

### `compileMockCode(code, options)`

Compiles JavaScript code with import statements using esbuild for browser execution.

**Parameters:**
- `code` (string): JavaScript code with import statements
- `options` (object, optional): Compilation options
  - `target` (string): Target ES version (default: 'es2020')
  - `format` (string): Output format (default: 'iife')
  - `minify` (boolean): Whether to minify output (default: false)
  - `sourcemap` (boolean): Whether to generate sourcemap (default: false)
  - `external` (string[]): External dependencies to exclude
  - `define` (Record<string, string>): Build-time constants

**Returns:** Promise<string> - Compiled JavaScript code ready for browser injection

## Usage Examples

### Basic Usage

```javascript
import { compileMockCode } from '../common-utils/esbuild-test-helpers.js';
import { addScriptToHtmlString } from '../common-utils/embed-helpers.js';
import html from "inline:../embed/chat.html";

const mockCode = `
    import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from '../chat.testdata.js';
    import { LLM_MAX_TOKENS_SETTING } from '../../constants.js';

    // Mock settings
    window.INJECTED_SETTINGS = {
        ...getLLMProviderSettings('groq'),
        [LLM_MAX_TOKENS_SETTING]: '100'
    };

    // Mock functions - using native JavaScript functions
    window.INJECTED_EMBED_COMMANDS_MOCK = {
        ...EMBED_COMMANDS_MOCK,
        getSettings: async () => window.INJECTED_SETTINGS,
        createNote: async (noteName, noteTags) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return "note-uuid-" + Math.random().toString(36).substring(2, 15);
        },
        insertNoteContent: async (note, content) => {
            return true;
        }
    };
`;

// Compile the mock code and inject into HTML
const compiledMockCode = await compileMockCode(mockCode);
const htmlWithMocks = addScriptToHtmlString(html, compiledMockCode);
```

### Before and After Comparison

#### Before (Template Literal Injection)
```javascript
const htmlWithMocks = addScriptToHtmlString(html, `
    window.INJECTED_SETTINGS = ${JSON.stringify({
        ...getLLMProviderSettings('groq'),
        [LLM_MAX_TOKENS_SETTING]: '100'
    })};

    window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
        ...EMBED_COMMANDS_MOCK,
        createNote: async (noteName, noteTags) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return "note-uuid-" + Math.random().toString(36).substring(2, 15);
        }
    }))};
`);
```

#### After (Compiled Mock Code)
```javascript
const mockCode = `
    import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from '../chat.testdata.js';
    import { LLM_MAX_TOKENS_SETTING } from '../../constants.js';

    window.INJECTED_SETTINGS = {
        ...getLLMProviderSettings('groq'),
        [LLM_MAX_TOKENS_SETTING]: '100'
    };

    window.INJECTED_EMBED_COMMANDS_MOCK = {
        ...EMBED_COMMANDS_MOCK,
        createNote: async (noteName, noteTags) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return "note-uuid-" + Math.random().toString(36).substring(2, 15);
        }
    };
`;

const compiledMockCode = await compileMockCode(mockCode);
const htmlWithMocks = addScriptToHtmlString(html, compiledMockCode);
```

## Benefits

1. **No Serialization Issues**: Functions work natively without `serializeWithFunctions`
2. **Proper Imports**: Use standard ES6 import statements
3. **Type Safety**: Better IDE support and type checking
4. **Maintainability**: Cleaner, more readable test code
5. **Debugging**: Better stack traces and error messages

## Error Handling

The functions provide detailed error messages for common issues:

- **Import Resolution Failures**: Clear indication of which imports could not be resolved
- **Syntax Errors**: Line-by-line error reporting with code context
- **ESBuild Errors**: Pass-through of esbuild error messages with helpful context

## Testing

Run the unit tests:
```bash
npx jest common-utils/test/esbuild-test-helpers.test.js
```

Run the integration tests:
```bash
node common-utils/test/esbuild-integration.test.js
```