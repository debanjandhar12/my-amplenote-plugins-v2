import { compileJavascriptCode } from "../../../../common-utils/esbuild-test-helpers.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Search Help Center tool', () => {
    const { getPage } = createPlaywrightHooks();
    
    it('should transition from init to completed state correctly', async () => {
        allure.epic('src-copilot');
        allure.description('Tests the complete flow of searching help center through the chat interface');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

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
                                "toolCallId": "helpCenter123",
                                "toolName": "SearchHelpCenter",
                                "argsText": "{query: 'how to use amplenote'}",
                                "args": {
                                    "query": "how to use amplenote"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "helpCenter123": {
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
                searchHelpCenter: async (query, options) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Mock search results
                    return [
                        {
                            "id": "https://www.amplenote.com/help/add-details-text-image-to-task#How_can_I_add_images%2C_text%2C_and_other_details_to_a_task%3F##3",
                            "metadata": {
                                "noteContentPart": "---\\ntitle: Creating tasks & to-do lists, and configuring t...\\nheaders: # # Different ways to add new tasks> ## ## Create a task from mobile Quick Task Bar\\n---\\n## Create a task from mobile Quick Task Bar",
                                "noteUUID": "https://www.amplenote.com/help/add-details-text-image-to-task#How_can_I_add_images%2C_text%2C_and_other_details_to_a_task%3F",
                                "noteTitle": "Creating tasks & to-do lists, and configuring task options",
                                "noteTags": [],
                                "headingAnchor": "Create_a_task_from_mobile_Quick_Task_Bar",
                                "isArchived": false,
                                "isTaskListNote": false,
                                "isSharedByMe": false,
                                "isSharedWithMe": false,
                                "isPublished": false
                            },
                            values: [0.002, 0.001],
                            "score": 0.6773007524015714
                        }
                    ];
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

        await allure.step('Verify API is called and search completes', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');

            const searchHelpCenterSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(searchHelpCenterSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify search results are displayed', async () => {
            // Verify tool card is rendered
            await page.waitForSelector('.rt-Card');
            const cardCount = await page.$$eval('.rt-Card', cards => cards.length);
            expect(cardCount).toBe(1);
            await takeScreenshot(page, 'Search results displayed');
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.epic('src-copilot');
        allure.description('Tests error handling when search help center API throws an error');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

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
                                "toolCallId": "helpCenter123",
                                "toolName": "SearchHelpCenter",
                                "argsText": "{query: 'how to use amplenote'}",
                                "args": {
                                    "query": "how to use amplenote"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "helpCenter123": {
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
                searchHelpCenter: async (query, options) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to search help center');
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
            const errorMessage = await page.waitForSelector('text=Failed to search help center');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });;
    }, 200000);
});