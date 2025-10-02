import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Update User Notes tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state and update notes upon user confirmation', async () => {
        allure.description('Tests the complete flow of updating notes through the chat interface');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import { mockApp, mockNote } from "./common-utils/amplenote-mocks.js";

            window.SETTINGS = {
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            };

            window.INIT_MESSAGES = [
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
                                "toolCallId": "updateNotes123",
                                "toolName": "UpdateUserNotes",
                                "args": {
                                    "notes": [
                                        {
                                            "noteUUID": "12345678-1234-1234-1234-123456789012",
                                            "noteTitle": "Updated Test Note",
                                            "noteContent": "# Updated Test Note\\n\\nThis is the updated content.",
                                            "tags": ["updated", "test"]
                                        },
                                        {
                                            "noteUUID": "87654321-4321-4321-4321-210987654321",
                                            "noteTitle": "Another Updated Note"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateNotes123": {
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

            window.mockApp = mockApp();
            
            // Create test notes
            const note1 = window.mockApp.createNote("Test Note", ["original"], "# Test Note\\n\\nThis is the original content.", "12345678-1234-1234-1234-123456789012");
            const note2 = window.mockApp.createNote("Another Note", ["tag1"], "# Another Note\\n\\nOriginal content here.", "87654321-4321-4321-4321-210987654321");

            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => window.SETTINGS,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INIT_MESSAGES) {
                        const injectMessages = window.INIT_MESSAGES;
                        window.INIT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                getNoteTitleByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note._content : "";
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.tags : [];
                },
                setNoteName: async (noteHandle, name) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await window.mockApp.setNoteName(noteHandle, name);
                },
                replaceNoteContent: async (noteHandle, content) => {
                    return await window.mockApp.replaceNoteContent(noteHandle, content);
                },
                addNoteTag: async (noteHandle, tag) => {
                    return await window.mockApp.addNoteTag(noteHandle, tag);
                },
                removeNoteTag: async (noteHandle, tag) => {
                    return await window.mockApp.removeNoteTag(noteHandle, tag);
                }
            });
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Verify tool init state', async () => {
            const initState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(initState).toEqual('init');
            await takeScreenshot(page, 'Tool initialized');
        });

        await allure.step('Verify UI elements are visible', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Update Notes")');
            expect(await submitButton.isVisible()).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            expect(await cancelButton.isVisible()).toBe(true);

            // Check that notes are listed
            const noteText = await page.waitForSelector('text=Updated Test Note');
            expect(await noteText.isVisible()).toBe(true);
        });

        await allure.step('Verify notes are not modified before submit click', async () => {
            const setNoteNameSpyInfo = await getSpyInfo(page, 'mockApp.setNoteName');
            expect(setNoteNameSpyInfo.callCount).toBe(0);

            const replaceNoteContentSpyInfo = await getSpyInfo(page, 'mockApp.replaceNoteContent');
            expect(replaceNoteContentSpyInfo.callCount).toBe(0);

            const addNoteTagSpyInfo = await getSpyInfo(page, 'mockApp.addNoteTag');
            expect(addNoteTagSpyInfo.callCount).toBe(0);

            const removeNoteTagSpyInfo = await getSpyInfo(page, 'mockApp.removeNoteTag');
            expect(removeNoteTagSpyInfo.callCount).toBe(0);

            const note1 = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note1.name).toBe('Test Note');
            expect(note1._content).toBe('# Test Note\n\nThis is the original content.');
            expect(note1.tags).toEqual(['original']);

            const note2 = await page.evaluate(() => window.mockApp.notes.find("87654321-4321-4321-4321-210987654321"));
            expect(note2.name).toBe('Another Note');
            expect(note2._content).toBe('# Another Note\n\nOriginal content here.');
            expect(note2.tags).toEqual(['tag1']);
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Update Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=2 notes updated successfully');
            expect(await successMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify notes are updated', async () => {
            const note1 = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note1.name).toBe('Updated Test Note');
            expect(note1._content).toBe('# Updated Test Note\n\nThis is the updated content.');
            expect(note1.tags).toEqual(['updated', 'test']);

            const note2 = await page.evaluate(() => window.mockApp.notes.find("87654321-4321-4321-4321-210987654321"));
            expect(note2.name).toBe('Another Updated Note');
        });

        await allure.step('Verify llm is called with tool results to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result.resultDetail).toBeDefined();
            expect(llmCallData.messages[0].content[0].result.resultDetail.length).toBe(2);
        });
    }, 20000);

    it('should transition from init to canceled state without updating notes upon user cancellation', async () => {
        allure.description('Tests that the tool correctly handles user cancellation and does not update notes');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import { mockApp, mockNote } from "./common-utils/amplenote-mocks.js";

            window.SETTINGS = {
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            };

            window.INIT_MESSAGES = [
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
                                "toolCallId": "updateNotes123",
                                "toolName": "UpdateUserNotes",
                                "args": {
                                    "notes": [
                                        {
                                            "noteUUID": "12345678-1234-1234-1234-123456789012",
                                            "noteTitle": "Updated Test Note"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateNotes123": {
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

            window.mockApp = mockApp();
            
            // Create test note
            const note1 = window.mockApp.createNote("Test Note", ["original"], "# Test Note\\n\\nThis is the original content.", "12345678-1234-1234-1234-123456789012");

            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => window.SETTINGS,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INIT_MESSAGES) {
                        const injectMessages = window.INIT_MESSAGES;
                        window.INIT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                getNoteTitleByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note._content : "";
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.tags : [];
                },
                setNoteName: async (noteHandle, name) => {
                    return await window.mockApp.setNoteName(noteHandle, name);
                },
                replaceNoteContent: async (noteHandle, content) => {
                    return await window.mockApp.replaceNoteContent(noteHandle, content);
                },
                addNoteTag: async (noteHandle, tag) => {
                    return await window.mockApp.addNoteTag(noteHandle, tag);
                },
                removeNoteTag: async (noteHandle, tag) => {
                    return await window.mockApp.removeNoteTag(noteHandle, tag);
                }
            });
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Verify tool init state', async () => {
            const initState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(initState).toEqual('init');
            await takeScreenshot(page, 'Tool initialized');
        });

        await allure.step('Click cancel button', async () => {
            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            await cancelButton.click();
        });

        await allure.step('Verify cancel message', async () => {
            const cancelMessage = await page.waitForSelector('text=canceled');
            expect(await cancelMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Cancel message displayed');
        });

        await allure.step('Verify note is not updated', async () => {
            const note = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note.name).toBe('Test Note'); // Original name
            expect(note._content).toBe('# Test Note\n\nThis is the original content.');
        });

        await allure.step('Verify llm not called when tool is canceled', async () => {
            const sendButton = page.getByRole('button', { name: 'Send' });
            const isSendButtonVisible = await sendButton.isVisible();
            expect(isSendButtonVisible).toBe(true);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when update note API throws an error');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import { mockApp, mockNote } from "./common-utils/amplenote-mocks.js";

            window.SETTINGS = {
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            };

            window.INIT_MESSAGES = [
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
                                "toolCallId": "updateNotes123",
                                "toolName": "UpdateUserNotes",
                                "args": {
                                    "notes": [
                                        {
                                            "noteUUID": "12345678-1234-1234-1234-123456789012",
                                            "noteTitle": "Updated Test Note"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateNotes123": {
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

            window.mockApp = mockApp();
            
            // Create test note
            const note1 = window.mockApp.createNote("Test Note", ["original"], "# Test Note\\n\\nThis is the original content.", "12345678-1234-1234-1234-123456789012");

            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => window.SETTINGS,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INIT_MESSAGES) {
                        const injectMessages = window.INIT_MESSAGES;
                        window.INIT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                getNoteTitleByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note._content : "";
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.notes.find(uuid);
                    return note ? note.tags : [];
                },
                setNoteName: async (noteHandle, name) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to update note name');
                },
                replaceNoteContent: async (noteHandle, content) => {
                    throw new Error('Failed to update note content');
                },
                addNoteTag: async (noteHandle, tag) => {
                    throw new Error('Failed to add note tag');
                },
                removeNoteTag: async (noteHandle, tag) => {
                    throw new Error('Failed to remove note tag');
                }
            });
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Verify tool init state', async () => {
            const initState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(initState).toEqual('init');
            await takeScreenshot(page, 'Tool initialized');
        });

        await allure.step('Click submit button to trigger error', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Update Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to update note name');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const setNoteNameSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(setNoteNameSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify llm is called with tool error to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result).toContain('Failed to update note name');
        });
    }, 20000);
});