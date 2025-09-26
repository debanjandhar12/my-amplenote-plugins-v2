import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Insert Tasks To Note tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state and insert tasks upon user confirmation', async () => {
        allure.description('Tests the complete flow of inserting tasks into a note through the chat interface');

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
                                "toolCallId": "insertTasks123",
                                "toolName": "InsertTasksToNote",
                                "args": {
                                    "tasks": [
                                        {
                                            "content": "Complete project documentation",
                                            "startAt": "2025-06-01T10:00:00.000Z"
                                        },
                                        {
                                            "content": "Review code changes",
                                            "startAt": "2025-06-02T14:00:00.000Z"
                                        }
                                    ],
                                    "noteUUID": "12345678-1234-1234-1234-123456789012"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "insertTasks123": {
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

            window.mockApp = mockApp(mockNote("# Test Note\\n\\nThis is the original content.", "Test Note", "12345678-1234-1234-1234-123456789012"));

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
                "getUserCurrentNoteData": async () => {
                    return {
                        currentNoteUUID: window.mockApp.context.noteUUID
                    }
                },
                insertTask: async (note, task) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return await window.mockApp.insertTask(note.uuid || note, task);
                },
                updateTask: async (...args) => {
                    return true;
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
            const submitButton = await page.waitForSelector('button:has-text("Insert Tasks")');
            expect(await submitButton.isVisible()).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            expect(await cancelButton.isVisible()).toBe(true);

            const noteSelector = await page.waitForSelector('button:has-text("Test Note")');
            expect(await noteSelector.isVisible()).toBe(true);
        });

        await allure.step('Verify API is not called before submit click', async () => {
            const insertTaskSpyInfo = await getSpyInfo(page, 'mockApp.insertTask');
            expect(insertTaskSpyInfo.callCount).toBe(0);
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Insert Tasks")');
            await submitButton.click();
        });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=2 tasks inserted successfully into note Test Note');
            expect(await successMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API is called and tasks are inserted', async () => {
            const insertTaskSpyInfo = await getSpyInfo(page, 'mockApp.insertTask');
            expect(insertTaskSpyInfo.callCount).toBe(2);

            const note = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note._content).toContain('- [ ] Complete project documentation');
            expect(note._content).toContain('- [ ] Review code changes');
        });

        await allure.step('Verify llm is called with tool results to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result.resultDetails).toBeDefined();
            expect(llmCallData.messages[0].content[0].result.resultDetails.length).toBe(2);
            
            const resultDetails = llmCallData.messages[0].content[0].result.resultDetails;
            expect(resultDetails[0].content).toBe('Complete project documentation');
            expect(resultDetails[0].startAt).toBe('2025-06-01T10:00:00.000Z');
            expect(resultDetails[0].taskUUID).toBeDefined();
            
            expect(resultDetails[1].content).toBe('Review code changes');
            expect(resultDetails[1].startAt).toBe('2025-06-02T14:00:00.000Z');
            expect(resultDetails[1].taskUUID).toBeDefined();
        });
    }, 20000);

    it('should transition from init to canceled state without inserting tasks upon user cancellation', async () => {
        allure.description('Tests that the tool correctly handles user cancellation and does not insert tasks');

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
                                "toolCallId": "insertTasks123",
                                "toolName": "InsertTasksToNote",
                                "args": {
                                    "tasks": [
                                        {
                                            "content": "Complete project documentation",
                                            "startAt": "2025-06-01T10:00:00.000Z"
                                        }
                                    ],
                                    "noteUUID": "12345678-1234-1234-1234-123456789012"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "insertTasks123": {
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

            window.mockApp = mockApp(mockNote("# Test Note\\n\\nThis is the original content.", "Test Note", "12345678-1234-1234-1234-123456789012"));

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
                "getUserCurrentNoteData": async () => {
                    return {
                        currentNoteUUID: window.mockApp.context.noteUUID
                    }
                },
                insertTask: async (note, task) => {
                    return await window.mockApp.insertTask(note.uuid || note, task);
                },
                updateTask: async (...args) => {
                    return true;
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
            const submitButton = await page.waitForSelector('button:has-text("Insert Tasks")');
            expect(await submitButton.isVisible()).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            expect(await cancelButton.isVisible()).toBe(true);

            const noteSelector = await page.waitForSelector('button:has-text("Test Note")');
            expect(await noteSelector.isVisible()).toBe(true);
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

        await allure.step('Verify API is not called and no tasks are inserted', async () => {
            const insertTaskSpyInfo = await getSpyInfo(page, 'mockApp.insertTask');
            expect(insertTaskSpyInfo.callCount).toBe(0);

            const note = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note._content).toBe('# Test Note\n\nThis is the original content.');
        });

        await allure.step('Verify llm not called when tool is canceled', async () => {
            const sendButton = page.getByRole('button', { name: 'Send' });
            const isSendButtonVisible = await sendButton.isVisible();
            expect(isSendButtonVisible).toBe(true);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when insert task API throws an error');

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
                                "toolCallId": "insertTasks123",
                                "toolName": "InsertTasksToNote",
                                "args": {
                                    "tasks": [
                                        {
                                            "content": "Complete project documentation",
                                            "startAt": "2025-06-01T10:00:00.000Z"
                                        }
                                    ],
                                    "noteUUID": "12345678-1234-1234-1234-123456789012"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "insertTasks123": {
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

            window.mockApp = mockApp(mockNote("# Test Note\\n\\nThis is the original content.", "Test Note", "12345678-1234-1234-1234-123456789012"));

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
                "getUserCurrentNoteData": async () => {
                    return {
                        currentNoteUUID: window.mockApp.context.noteUUID
                    }
                },
                insertTask: async (note, task) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to insert task');
                },
                updateTask: async (...args) => {
                    // Throw an error to simulate API failure
                    throw new Error('Failed to update task');
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
            const submitButton = await page.waitForSelector('button:has-text("Insert Tasks")');
            await submitButton.click();
        });

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to insert task');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const insertTaskSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(insertTaskSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify llm is called with tool error to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result).toContain('Failed to insert task');
        });
    }, 20000);
});
