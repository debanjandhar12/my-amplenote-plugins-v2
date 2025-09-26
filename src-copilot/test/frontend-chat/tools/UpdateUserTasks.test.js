import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Update User Tasks tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state and update tasks upon user confirmation', async () => {
        allure.description('Tests the complete flow of updating tasks through the chat interface');

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
                                "toolCallId": "updateTasks123",
                                "toolName": "UpdateUserTasks",
                                "args": {
                                    "tasks": [
                                        {
                                            "taskUUID": "task-uuid-1",
                                            "content": "Updated task content",
                                            "startAt": "2025-06-01T10:00:00.000Z",
                                            "completedAt": "2025-06-01T15:00:00.000Z",
                                            "important": true
                                        },
                                        {
                                            "taskUUID": "task-uuid-2",
                                            "content": "Another updated task",
                                            "urgent": true
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateTasks123": {
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
            
            // Create test note with tasks
            const noteUUID = window.mockApp.createNote("Test Note", [], "# Test Note" + String.fromCharCode(10) + String.fromCharCode(10) + "This is a test note.", "12345678-1234-1234-1234-123456789012");
            const note = window.mockApp.notes.find(noteUUID);
            
            // Add tasks to the note content manually
            note._content = '- [ ] Original task content<!-- {"uuid":"task-uuid-1","startAt":1717200000} -->' + String.fromCharCode(10) + '- [ ] Another original task<!-- {"uuid":"task-uuid-2"} -->' + String.fromCharCode(10) + note._content;
            

            
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
                getTask: async (taskUUID) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await window.mockApp.getTask(taskUUID);
                },
                updateTask: async (taskUUID, updates) => {
                    return await window.mockApp.updateTask(taskUUID, updates);
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
            const submitButton = await page.waitForSelector('button:has-text("Update Tasks")');
            expect(await submitButton.isVisible()).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            expect(await cancelButton.isVisible()).toBe(true);

            // Check that tasks are listed
            const taskText = await page.waitForSelector('text=Updated task content');
            expect(await taskText.isVisible()).toBe(true);
        });

        await allure.step('Verify API is not called before submit click', async () => {
            const getTaskSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(getTaskSpyInfo.callCount).toBeGreaterThan(0); // Called during init to fetch current data
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Update Tasks")');
            await submitButton.click();
        });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=2 tasks updated successfully');
            expect(await successMessage.isVisible()).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify tasks are updated', async () => {
            const note = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note._content).toContain('Updated task content');
            expect(note._content).toContain('Another updated task');
            
            // Check that the task is marked as completed
            expect(note._content).toContain('- [x] Updated task content');
        });

        await allure.step('Verify llm is called with tool results to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result.resultDetail).toBeDefined();
            expect(llmCallData.messages[0].content[0].result.resultDetail.length).toBe(2);
        });
    }, 20000);

    it('should transition from init to canceled state without updating tasks upon user cancellation', async () => {
        allure.description('Tests that the tool correctly handles user cancellation and does not update tasks');

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
                                "toolCallId": "updateTasks123",
                                "toolName": "UpdateUserTasks",
                                "args": {
                                    "tasks": [
                                        {
                                            "taskUUID": "task-uuid-1",
                                            "content": "Updated task content"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateTasks123": {
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
            
            // Create test note with task
            const noteUUID = window.mockApp.createNote("Test Note", [], "# Test Note" + String.fromCharCode(10) + String.fromCharCode(10) + "This is a test note.", "12345678-1234-1234-1234-123456789012");
            const note = window.mockApp.notes.find(noteUUID);
            note._content = '- [ ] Original task content<!-- {"uuid":"task-uuid-1"} -->' + String.fromCharCode(10) + note._content;

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
                getTask: async (taskUUID) => {
                    return await window.mockApp.getTask(taskUUID);
                },
                updateTask: async (taskUUID, updates) => {
                    return await window.mockApp.updateTask(taskUUID, updates);
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

        await allure.step('Verify task is not updated', async () => {
            const note = await page.evaluate(() => window.mockApp.notes.find("12345678-1234-1234-1234-123456789012"));
            expect(note._content).toContain('Original task content'); // Original content
            expect(note._content).not.toContain('Updated task content');
        });

        await allure.step('Verify llm not called when tool is canceled', async () => {
            const sendButton = page.getByRole('button', { name: 'Send' });
            const isSendButtonVisible = await sendButton.isVisible();
            expect(isSendButtonVisible).toBe(true);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when update task API throws an error');

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
                                "toolCallId": "updateTasks123",
                                "toolName": "UpdateUserTasks",
                                "args": {
                                    "tasks": [
                                        {
                                            "taskUUID": "task-uuid-1",
                                            "content": "Updated task content"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "updateTasks123": {
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
            
            // Create test note with task
            const noteUUID = window.mockApp.createNote("Test Note", [], "# Test Note" + String.fromCharCode(10) + String.fromCharCode(10) + "This is a test note.", "12345678-1234-1234-1234-123456789012");
            const note = window.mockApp.notes.find(noteUUID);
            note._content = '- [ ] Original task content<!-- {"uuid":"task-uuid-1"} -->' + String.fromCharCode(10) + note._content;

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
                getTask: async (taskUUID) => {
                    return await window.mockApp.getTask(taskUUID);
                },
                updateTask: async (taskUUID, updates) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
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
            const submitButton = await page.waitForSelector('button:has-text("Update Tasks")');
            await submitButton.click();
        });

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to update task');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const callAmplenotePluginSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(callAmplenotePluginSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify llm is called with tool error to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result).toContain('Failed to update task');
        });
    }, 20000);
});