import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';
import sinon from 'sinon';

describe('Web Search tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });
    
    it('should transition from init to completed state correctly', async () => {
        allure.description('Tests the complete flow of web search through the chat interface');

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
                        "id": "HpwSUwU",
                        "role": "assistant",
                        "status": {
                            "type": "requires-action",
                            "reason": "tool-calls"
                        },
                        "content": [
                            {
                                "type": "tool-call",
                                "toolCallId": "DRX5Pd4giycDhw2o",
                                "toolName": "WebSearch",
                                "argsText": "{\\"query\\":\\"best pokemon\\"}",
                                "args": {
                                    "query": "best pokemon"
                                }
                            }
                        ],
                        "metadata": {
                            "unstable_annotations": [],
                            "unstable_data": [],
                            "custom": {
                                "toolStateStorage": {
                                    "DRX5Pd4giycDhw2o": {
                                        "formState": "init",
                                        "formData": {},
                                        "formError": null
                                    }
                                }
                            }
                        },
                        "createdAt": "2025-05-24T09:05:39.654Z"
                    },
                    "parentId": null
                }
            ];
            
            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => {
                    return window.SETTINGS;
                },
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INIT_MESSAGES) {
                        const injectMessages = window.INIT_MESSAGES;
                        window.INIT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                webSearch: async (query, options) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Mock search results
                    return [
                        {
                            title: "Best Pokemon of All Time",
                            url: "https://example.com/best-pokemon",
                            snippet: "Discover the most powerful and popular Pokemon...",
                            content: "Detailed content about the best Pokemon characters..."
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

            const webSearchSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(webSearchSpyInfo.callCount).toBeGreaterThan(0);
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
        allure.description('Tests error handling when web search API throws an error');

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
                        "id": "HpwSUwU",
                        "role": "assistant",
                        "status": {
                            "type": "requires-action",
                            "reason": "tool-calls"
                        },
                        "content": [
                            {
                                "type": "tool-call",
                                "toolCallId": "DRX5Pd4giycDhw2o",
                                "toolName": "WebSearch",
                                "argsText": "{\\"query\\":\\"best pokemon\\"}",
                                "args": {
                                    "query": "best pokemon"
                                }
                            }
                        ],
                        "metadata": {
                            "unstable_annotations": [],
                            "unstable_data": [],
                            "custom": {
                                "toolStateStorage": {
                                    "DRX5Pd4giycDhw2o": {
                                        "formState": "init",
                                        "formData": {},
                                        "formError": null
                                    }
                                }
                            }
                        },
                        "createdAt": "2025-05-24T09:05:39.654Z"
                    },
                    "parentId": null
                }
            ];
            window.fetch = async (url, options) => {
                // Add timeout so that test can capture state
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Throw an error to simulate API failure
                throw new Error('Failed to perform web search');
            };
            
            window.callAmplenotePlugin = createCallAmplenotePluginMock({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => {
                    return window.SETTINGS;
                },
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INIT_MESSAGES) {
                        const injectMessages = window.INIT_MESSAGES;
                        window.INIT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
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
            const errorMessage = await page.waitForSelector('text=Failed to perform web search');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const webSearchSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(webSearchSpyInfo.callCount).toBeGreaterThan(0);
        });
    }, 20000);
});