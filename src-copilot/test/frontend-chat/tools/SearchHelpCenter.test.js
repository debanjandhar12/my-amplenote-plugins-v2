import {addScriptToHtmlString} from "../../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from ".././chat.testdata.js";
import html from "inline:../../../embed/chat.html";

import {
    LLM_MAX_TOKENS_SETTING
} from "../../../constants.js";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";

describe('Search Help Center tool', () => {
    const {getPage} = createPlaywrightHooks();
    
    it('works correctly', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_SETTINGS = ${JSON.stringify({
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            })};

            window.INJECT_MESSAGES = [
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

            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => window.INJECTED_SETTINGS,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INJECT_MESSAGES) {
                        const injectMessages = window.INJECT_MESSAGES;
                        window.INJECT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                searchHelpCenter: async (query, options) => {
                    // Mock search results
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return [
                        {
                            "id": "https://www.amplenote.com/help/add-details-text-image-to-task#How_can_I_add_images%2C_text%2C_and_other_details_to_a_task%3F##3",
                            "metadata": {
                                "noteContentPart": "---\ntitle: Creating tasks & to-do lists, and configuring t...\nheaders: # # Different ways to add new tasks> ## ## Create a task from mobile Quick Task Bar\n---\n## Create a task from mobile Quick Task Bar",
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
