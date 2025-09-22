import { compileJavascriptCode } from "../../../../common-utils/esbuild-test-helpers.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';
import { mockApp, mockNote } from "../../../../common-utils/amplenote-mocks.js";

describe('Delete User Notes tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state and delete notes upon user confirmation', async () => {
        allure.description('Tests the complete flow of deleting notes through the chat interface');

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
                                "toolCallId": "deleteNotes123",
                                "toolName": "DeleteUserNotes",
                                "argsText": '{notes: [{noteUUID: "note-uuid-1"}, {noteUUID: "note-uuid-2"}]}',
                                "args": {
                                    "notes": [
                                        { "noteUUID": "note-uuid-1" },
                                        { "noteUUID": "note-uuid-2" }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "deleteNotes123": {
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
            window.mockApp._noteRegistry["note-uuid-1"] = mockNote("# Test Note 1", "Test Note 1", "note-uuid-1", ["tag1"]);
            window.mockApp._noteRegistry["note-uuid-2"] = mockNote("# Test Note 2", "Test Note 2", "note-uuid-2", ["tag2"]);

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
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.name : null;
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.tags : [];
                },
                deleteNote: async ({ uuid }) => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await window.mockApp.deleteNote({ uuid });
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
            const submitButton = await page.waitForSelector('button:has-text("Delete Notes")');
            expect(await submitButton.isVisible()).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            expect(await cancelButton.isVisible()).toBe(true);
        });

        await allure.step('Verify API is not called before submit click', async () => {
            const deleteNoteSpyInfo = await getSpyInfo(page, 'mockApp.deleteNote');
            expect(deleteNoteSpyInfo.callCount).toBe(0);
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Delete Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=2 notes deleted successfully');
            expect(await successMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API is called and notes are deleted', async () => {
            const deleteNoteSpyInfo = await getSpyInfo(page, 'mockApp.deleteNote');
            expect(deleteNoteSpyInfo.callCount).toBe(2);

            const allNotes = await page.evaluate(() => window.mockApp.filterNotes({}));
            expect(allNotes.length).toBe(0);
        });
    }, 20000);

    it('should transition from init to canceled state without deleting notes upon user cancellation', async () => {
        allure.description('Tests that the tool correctly handles user cancellation and does not delete notes');

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
                                "toolCallId": "deleteNotes123",
                                "toolName": "DeleteUserNotes",
                                "argsText": '{notes: [{noteUUID: "note-uuid-1"}]}',
                                "args": {
                                    "notes": [
                                        { "noteUUID": "note-uuid-1" }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "deleteNotes123": {
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
            window.mockApp._noteRegistry["note-uuid-1"] = mockNote("# Test Note 1", "Test Note 1", "note-uuid-1", ["tag1"]);

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
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.name : null;
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.tags : [];
                },
                deleteNote: async ({ uuid }) => {
                    return await window.mockApp.deleteNote({ uuid });
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
            const successMessage = await page.waitForSelector('text=canceled');
            expect(await successMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Cancel message displayed');
        });

        await allure.step('Verify API is not called and no notes are deleted', async () => {
            const deleteNoteSpyInfo = await getSpyInfo(page, 'mockApp.deleteNote');
            expect(deleteNoteSpyInfo.callCount).toBe(0);

            const allNotes = await page.evaluate(() => window.mockApp.filterNotes({}));
            expect(allNotes.length).toBe(1);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when delete note API throws an error');

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
                                "toolCallId": "deleteNotes123",
                                "toolName": "DeleteUserNotes",
                                "argsText": '{notes: [{noteUUID: "note-uuid-1"}]}',
                                "args": {
                                    "notes": [
                                        { "noteUUID": "note-uuid-1" }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "deleteNotes123": {
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
            window.mockApp._noteRegistry["note-uuid-1"] = mockNote("# Test Note 1", "Test Note 1", "note-uuid-1", ["tag1"]);

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
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.name : null;
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.tags : [];
                },
                deleteNote: async ({ uuid }) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to delete note');
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
            const submitButton = await page.waitForSelector('button:has-text("Delete Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to delete note');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const deleteNoteSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(deleteNoteSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify note was not deleted due to error', async () => {
            const allNotes = await page.evaluate(() => window.mockApp.filterNotes({}));
            expect(allNotes.length).toBe(1);
        });
    }, 20000);
});