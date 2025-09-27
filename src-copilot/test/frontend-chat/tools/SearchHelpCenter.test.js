import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Search Help Center tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });
    
    it('should transition from init to completed state correctly', async () => {
        allure.description('Tests the complete flow of searching help center through the chat interface');

        const mockCode = /* javascript */ `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";
            import sinon from 'sinon';

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
            
            window.searchHelpCenter = sinon.spy(async (query, options) => {
                // Add timeout so that test can capture state
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Mock search results
                return [
                    { "id": "https://www.amplenote.com/help/inline_tags_note_reference_filtering##0012", "noteUUID": "https://www.amplenote.com/help/inline_tags_note_reference_filtering", "noteTitle": "🔎 Note Reference Filtering", "actualNoteContentPart": "## Linking and categorizing ideas\\nInline Tags don't just apply to tasks! You can reference notes in any arbitrary type of block, such as ordinary paragraphs, bullet points or headings.\\n\\nIf you've been using Amplenote's backlinks for a while, you know that [you can browse all of the incoming links of a note using the Backlinks tab found at the bottom of that note](/help/backlinking_bidirectional_linking) . Also, you've probably noticed that in addition to displaying the link itself, Amplenote also shows you the surrounding context of that link. \\n\\nWhen you reference a note in a block, everything \\"underneath\\" that block is effectively tagged with that Note Reference a.k.a. Inline Tag. Make sure to read up on [Backlinking (bidirectional linking) examples, filtering backlinks, targeting backlink content#What will get shown in the Backlinks tab?](/help/backlinking_bidirectional_linking#What_will_get_shown_in_the_Backlinks_tab?)  for more details on this, but to cut a long story short: \\nTagging a bullet or a task also tags all of its sub-bullets/sub-tasks;\\nTagging a heading also tags all of the blocks contained in that heading or in [headings of lower order]() . \\n\\nIf you're a Jots user, you might already intuit how to apply this functionality: with Inline Tagging you can carry out almost all of your note-taking and task-creating straight from your Daily Jot.\\n\\nLet's take the example of meeting notes. One way to capture relevant info pertaining to work meetings is to create a separate note and title it accordingly:\\n\\n\\n\\n\\n\\n\\nThe other way to achieve this would be to **write the meeting notes directly inside your Jot**:\\n\\n\\nNotice how we tag the bullet point with both [Planning meeting]()  and [@Richard]() . Instead of creating a note for each planning meeting, we're creating two notes that we can reuse [whenever they are implied by the context]() .\\n\\n\\nNow, when visiting the backlinks tab for the note called \\"Planning meeting\\", we can see [when]()  this meeting happened, who it happened with, and any notes we've taken in the sub-bullet points:\\n\\n\\nThe Backlinks tab for a note called \\"Planning meeting\\"\\n\\n\\nNow on to the good stuff: Note Reference Filtering allow us to get detailed reports of the things we journal about. For example, if we want to see a list of all of the Planning meetings that happened with Richard, we can use the Note Reference filter to select Richard's note from the list:", "similarity": 0.8125832080841064 }
                ];
            });
                
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
                searchHelpCenter: window.searchHelpCenter
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

            const searchHelpCenterSpyInfo = await getSpyInfo(page, 'searchHelpCenter');
            expect(searchHelpCenterSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify search results are displayed', async () => {
            // Verify tool card is rendered
            await page.waitForSelector('.rt-Card');
            const cardCount = await page.$$eval('.rt-Card', cards => cards.length);
            expect(cardCount).toBe(1);
            await takeScreenshot(page, 'Search results displayed');
        });

        await allure.step('Verify llm is called with tool results to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result.searchResults[0].noteTitle).toEqual('🔎 Note Reference Filtering');
            expect(llmCallData.messages[0].content[0].result.searchResults[0].actualNoteContentPart).toContain('Linking and categorizing ideas');
        })
    }, 20000);

    it('should handle API error correctly', async () => {
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
        });

        await allure.step('Verify llm is called with tool error to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result).toContain('Failed to search help center');
        });
    }, 200000);
});