import { compileJavascriptCode } from "../../../../common-utils/esbuild-test-helpers.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Create New Notes tool', () => {
    const { getPage } = createPlaywrightHooks();

    it('works correctly through all states', async () => {
        allure.epic('Copilot Plugin');
        allure.feature('Chat Tools');
        allure.story('Create New Notes');
        allure.description('Tests the complete flow of creating new notes through the chat interface');
        allure.tag('frontend');
        allure.tag('integration');
        allure.severity('critical');
        
        const mockCode = /* javascript */ `
            import sinon from 'sinon';
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from './src-copilot/constants.js';
            import {createCallAmplenotePluginMock} from "./common-utils/embed-comunication.js";

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
                                "toolCallId": "createNotes123",
                                "toolName": "CreateNewNotes",
                                "argsText": '{notes: [{noteName: "Project Documentation", noteTags: ["project", "docs"], noteContent: "# Project Documentation\\\\n\\\\nThis is a placeholder for project documentation."}, {noteName: "Meeting Notes", noteTags: ["meeting"], noteContent: "# Meeting Notes\\\\n\\\\nAgenda items for next meeting:"}]}',
                                "args": {
                                    "notes": [
                                        {
                                            "noteName": "Project Documentation",
                                            "noteTags": ["project", "docs"],
                                            "noteContent": "# Project Documentation\\\\n\\\\nThis is a placeholder for project documentation."
                                        },
                                        {
                                            "noteName": "Meeting Notes",
                                            "noteTags": ["meeting"],
                                            "noteContent": "# Meeting Notes\\\\n\\\\nAgenda items for next meeting:"
                                        }
                                    ]
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "createNotes123": {
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

            // Setup spy methods
            const sinonSandbox = sinon.createSandbox();
            window.createNoteSpy = sinonSandbox.spy(async (noteName, noteTags) => {
                // Add timeout so that test can capture state
                await new Promise(resolve => setTimeout(resolve, 2000));
                return "note-uuid-" + Math.random().toString(36).substring(2, 15);
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
                createNote: window.createNoteSpy,
                insertNoteContent: async (note, content) => {
                    return true;
                }
            });
        `;
        
        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Verify tool initialization', async () => {
            const initState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(initState).toEqual('init');
            await takeScreenshot(page, 'Tool initialized');
        });

        await allure.step('Verify UI elements are visible', async () => {
            // Check if the submit button exists and is visible
            const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
            const isSubmitButtonVisible = await submitButton.isVisible();
            expect(isSubmitButtonVisible).toBe(true);

            // Check if the cancel button exists and is visible
            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            const isCancelButtonVisible = await cancelButton.isVisible();
            expect(isCancelButtonVisible).toBe(true);
        });

        await allure.step('Submit note creation', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool completion', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            console.log('Checking for success message');
            const successMessage = await page.waitForSelector('text=2 notes created successfully');
            const isSuccessMessageVisible = await successMessage.isVisible();
            expect(isSuccessMessageVisible).toBe(true);
            console.log('Success message is visible: "2 notes created successfully"');
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API call count', async () => {
            const createNoteSpyInfo = await getSpyInfo(page, 'createNoteSpy');
            expect(createNoteSpyInfo.callCount).toBe(2);
        });
    }, 20000);
});