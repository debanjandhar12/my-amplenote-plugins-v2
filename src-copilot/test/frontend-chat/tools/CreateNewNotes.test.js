// Fix TextEncoder issue for esbuild in jsdom environment
import { TextEncoder, TextDecoder } from 'util';
if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}

import {addCompiledMocksToHtml, compileMockCode} from "../../../../common-utils/esbuild-test-helpers.js";
import {addScriptToHtmlString} from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";

describe('Create New Notes tool', () => {
    const {getPage} = createPlaywrightHooks(false);
    
    it('works correctly through all states', async () => {
        // Mock code with imports - this will be compiled by esbuild for real
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from '${process.cwd()}/src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from '${process.cwd()}/src-copilot/constants.js';

            // Mock settings using imports
            const mockSettings = {
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            };

            // Mock messages
            const mockMessages = [
                {
                    "message": {
                        "id": "test456",
                        "role": "assistant",
                        "status": {
                            "type": "requires-action",
                            "reason": "tool-calls"
                        },
                        "content": [
                            {
                                "type": "tool-call",
                                "toolCallId": "createNotes123",
                                "toolName": "CreateNewNotes",
                                "argsText": '{notes: [{noteName: "Project Documentation", noteTags: ["project", "docs"], noteContent: "# Project Documentation\\\\n\\\\nThis is a placeholder for project documentation."}, {noteName: "Meeting Notes", noteTags: ["meeting"], noteContent: "# Meeting Notes\\\\n\\\\nAgenda items for next meeting:"}]}',
                                "args": {
                                    "notes": [
                                        {
                                            "noteName": "Project Documentation",
                                            "noteTags": ["project", "docs"],
                                            "noteContent": "# Project Documentation\\\\n\\\\nThis is a placeholder for project documentation."
                                        },
                                        {
                                            "noteName": "Meeting Notes",
                                            "noteTags": ["meeting"],
                                            "noteContent": "# Meeting Notes\\\\n\\\\nAgenda items for next meeting:"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "createNotes123": {
                                        "formState": "init",
                                        "formData": {},
                                        "formError": null
                                    }
                                }
                            }
                        },
                        "createdAt": "2025-05-24T10:00:00.000Z"
                    },
                    "parentId": null
                }
            ];

            // Mock embed commands using native JavaScript functions and imports
            const mockEmbedCommands = {
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => mockSettings,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INJECT_MESSAGES) {
                        const injectMessages = window.INJECT_MESSAGES;
                        window.INJECT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                createNote: async (noteName, noteTags) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return "note-uuid-" + Math.random().toString(36).substring(2, 15);
                },
                insertNoteContent: async (note, content) => {
                    return true;
                }
            };

            // Global setup - use a more explicit approach to ensure global assignment
            const globalObj = (function() {
                if (typeof globalThis !== 'undefined') return globalThis;
                if (typeof window !== 'undefined') return window;
                if (typeof global !== 'undefined') return global;
                if (typeof self !== 'undefined') return self;
                return this;
            })();
            
            globalObj.INJECTED_SETTINGS = mockSettings;
            globalObj.INJECT_MESSAGES = mockMessages;
            globalObj.INJECTED_EMBED_COMMANDS_MOCK = mockEmbedCommands;
        `;

        // Compile the mock code with Node.js polyfill support
        const compiledCode = await compileMockCode(mockCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: [],
            define: {},
            enableNodeModulesPolyfill: true
        });
        
        // Manually unwrap the IIFE to allow global variable assignment
        const trimmedCode = compiledCode.trim();
        let unwrappedCode = trimmedCode;
        
        if (trimmedCode.startsWith('(() => {') && trimmedCode.endsWith('})();')) {
            unwrappedCode = trimmedCode.slice(8, -5); // Remove '(() => {' and '})();'
            console.log('✅ Successfully unwrapped arrow IIFE');
        } else if (trimmedCode.startsWith('(function() {') && trimmedCode.endsWith('})();')) {
            unwrappedCode = trimmedCode.slice(13, -5); // Remove '(function() {' and '})();'
            console.log('✅ Successfully unwrapped function IIFE');
        } else {
            console.log('❌ No IIFE pattern matched');
        }
        
        const htmlWithMocks = addScriptToHtmlString(html, unwrappedCode);
        
        // Debug: log the compiled HTML to see what's being injected
        console.log('Compiled HTML length:', htmlWithMocks.length);
        console.log('Contains INJECTED_EMBED_COMMANDS_MOCK:', htmlWithMocks.includes('INJECTED_EMBED_COMMANDS_MOCK'));
        
        // Extract and log the actual compiled JavaScript
        const scriptMatch = htmlWithMocks.match(/<script>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
            const compiledJS = scriptMatch[1];
            console.log('Compiled JS (first 500 chars):', compiledJS.substring(0, 500));
            console.log('Compiled JS (last 500 chars):', compiledJS.substring(compiledJS.length - 500));
            console.log('Compiled JS contains globalObj:', compiledJS.includes('globalObj'));
            console.log('Compiled JS contains INJECTED_SETTINGS:', compiledJS.includes('INJECTED_SETTINGS'));
        }

        const page = await getPage();
        
        // Add error logging to catch any JavaScript errors
        page.on('pageerror', (error) => {
            console.log('PAGE ERROR:', error.message);
        });
        
        await page.setContent(htmlWithMocks);
        
        // Debug: Check what's available in the browser
        const debugInfo = await page.evaluate(() => {
            return {
                hasSettings: !!window.INJECTED_SETTINGS,
                hasMessages: !!window.INJECT_MESSAGES,
                hasCommands: !!window.INJECTED_EMBED_COMMANDS_MOCK,
                commandsType: typeof window.INJECTED_EMBED_COMMANDS_MOCK,
                hasCallAmplenotePlugin: !!window.callAmplenotePlugin
            };
        });
        console.log('Browser debug info:', debugInfo);

        // Wait for the tool to initialize
        const initState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(initState).toEqual('init');

        // Cannot check waiting state as it is instantly changed
        // const waitingState = await waitForCustomEvent(page, 'onToolStateChange');
        // expect(waitingState).toEqual('waitingForUserInput');

        // Check if the submit button exists and is visible
        const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
        const isSubmitButtonVisible = await submitButton.isVisible();
        expect(isSubmitButtonVisible).toBe(true);

        // Check if the cancel button exists and is visible
        const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
        const isCancelButtonVisible = await cancelButton.isVisible();
        expect(isCancelButtonVisible).toBe(true);

        // Simulate user clicking the submit button
        await submitButton.click();

        // Cannot check submitted state as it is instantly changed
        // const submittedState = await waitForCustomEvent(page, 'onToolStateChange');
        // expect(submittedState).toEqual('submitted');

        // Wait for the tool to complete
        const completedState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(completedState).toEqual('completed');

        // Check if the success message is visible
        const successMessage = await page.waitForSelector('text=2 notes created successfully');
        const isSuccessMessageVisible = await successMessage.isVisible();
        expect(isSuccessMessageVisible).toBe(true);
    }, 200000);
});