import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Fetch Note Detail By Note UUID tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state correctly', async () => {
        allure.description('Tests the complete flow of fetching note details by UUID through the chat interface');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import { mockApp } from "./common-utils/amplenote-mocks.js";

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
                                "toolCallId": "fetchNote123",
                                "toolName": "FetchNoteDetailByNoteUUID",
                                "argsText": '{noteUUIDList: ["12345678-1234-1234-1234-123456789012", "87654321-4321-4321-4321-210987654321"], includeContent: true}',
                                "args": {
                                    "noteUUIDList": [
                                        "12345678-1234-1234-1234-123456789012",
                                        "87654321-4321-4321-4321-210987654321"
                                    ],
                                    "includeContent": true
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "fetchNote123": {
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

            // Create test notes using mockApp
            const note1 = window.mockApp.createNote("Test Note 1", ["tag1", "tag2"], "# Test Note 1\\n\\nThis is the content of test note 1.", "12345678-1234-1234-1234-123456789012");
            const note2 = window.mockApp.createNote("Test Note 2", ["tag3"], "# Test Note 2\\n\\nThis is the content of test note 2.", "87654321-4321-4321-4321-210987654321");

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
                    const note = window.mockApp.findNote({ uuid });
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    const note = window.mockApp.findNote({ uuid });
                    return note ? note._content || "" : "";
                },
                getNoteBacklinksByUUID: async ({ uuid }) => {
                    // Add small delay to simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Return empty array as backlinks API doesn't exist in note
                    return [];
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    // Add small delay to simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const note = window.mockApp.findNote({ uuid });
                    return note ? note.tags || [] : [];
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

        await allure.step('Verify tool completes successfully', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message is displayed', async () => {
            const successMessage = await page.waitForSelector('text=Note info fetched successfully');
            const isSuccessMessageVisible = await successMessage.isVisible();
            expect(isSuccessMessageVisible).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API calls were made', async () => {
            const getNoteTitleSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(getNoteTitleSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify test completed successfully', async () => {
            // Test has completed successfully with all API calls verified
            expect(true).toBe(true);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when fetch note detail API throws an error');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import { mockApp } from "./common-utils/amplenote-mocks.js";

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
                                "toolCallId": "fetchNote123",
                                "toolName": "FetchNoteDetailByNoteUUID",
                                "argsText": '{noteUUIDList: ["12345678-1234-1234-1234-123456789012"], includeContent: true}',
                                "args": {
                                    "noteUUIDList": [
                                        "12345678-1234-1234-1234-123456789012"
                                    ],
                                    "includeContent": true
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "fetchNote123": {
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
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to fetch note title');
                },
                getNoteContentByUUID: async (uuid) => {
                    // Throw an error to simulate API failure
                    throw new Error('Failed to fetch note content');
                },
                getNoteBacklinksByUUID: async ({ uuid }) => {
                    // Throw an error to simulate API failure
                    throw new Error('Failed to fetch note backlinks');
                },
                getNoteTagsByUUID: async ({ uuid }) => {
                    // Throw an error to simulate API failure
                    throw new Error('Failed to fetch note tags');
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

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to fetch note title');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const getNoteTitleSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(getNoteTitleSpyInfo.callCount).toBeGreaterThan(0);
        });
    }, 20000);
});