import {addScriptToHtmlString} from "../../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from ".././chat.testdata.js";
import html from "inline:../../../embed/chat.html";

import {
    LLM_MAX_TOKENS_SETTING
} from "../../../constants.js";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";


describe('Web Search tool', () => {
    const {getPage} = createPlaywrightHooks();
    it('works correctly', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        })};
        
        window.INJECT_MESSAGES = [
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
        
        window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
            ...EMBED_COMMANDS_MOCK,
            getSettings: async () => {
                return window.INJECTED_SETTINGS;
            },
            receiveMessageFromPlugin: async (queue) => {
                if (queue === 'attachments' && window.INJECT_MESSAGES) {
                    const injectMessages = window.INJECT_MESSAGES;
                    window.INJECT_MESSAGES = null;
                    return {type: 'new-chat', message: injectMessages};
                }
                return null;
            }
        }))};
        `);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        // Wait for the tool to initialize
        const initState = await waitForCustomEvent(page, 'onToolStateChange');
        await expect(initState).toEqual('init');

        // Wait for the tool to complete
        const completedState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(completedState).toEqual('completed');

        // Verify tool card is rendered
        await page.waitForSelector('.rt-Card');
        const cardCount = await page.$$eval('.rt-Card', cards => cards.length);
        expect(cardCount).toBe(1);
    }, 20000);
});