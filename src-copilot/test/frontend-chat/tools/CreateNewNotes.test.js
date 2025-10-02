import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Create New Notes tool', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should transition from init to completed state and create notes upon user confirmation', async () => {
        allure.description('Tests the complete flow of creating new notes through the chat interface');

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
                                "toolCallId": "createNotes123",
                                "toolName": "CreateNewNotes",
                                "argsText": '{notes: [{noteName: "Project Documentation", noteTags: ["project", "docs"], noteContent: "# Project Documentation\\n\\nThis is a placeholder for project documentation."}, {noteName: "Meeting Notes", noteTags: ["meeting"], noteContent: "# Meeting Notes\\n\\nAgenda items for next meeting:"}]}',
                                "args": {
                                    "notes": [
                                        {
                                            "noteName": "Project Documentation",
                                            "noteTags": ["project", "docs"],
                                            "noteContent": "# Project Documentation\\n\\nThis is a placeholder for project documentation."
                                        },
                                        {
                                            "noteName": "Meeting Notes",
                                            "noteTags": ["meeting"],
                                            "noteContent": "# Meeting Notes\\n\\nAgenda items for next meeting:"
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
                createNote: async (noteName, noteTags) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return await window.mockApp.createNote(noteName, noteTags);
                },
                insertNoteContent: async (note, content) => {
                    return await window.mockApp.insertNoteContent(note.uuid || note, content);
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
            // Check if the submit button exists and is visible
            const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
            const isSubmitButtonVisible = await submitButton.isVisible();
            expect(isSubmitButtonVisible).toBe(true);

            // Check if the cancel button exists and is visible
            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            const isCancelButtonVisible = await cancelButton.isVisible();
            expect(isCancelButtonVisible).toBe(true);
        });

        await allure.step('Verify API is not called before submit click and no notes created yet', async () => {
            const createNoteSpyInfo = await getSpyInfo(page, 'mockApp.createNote');
            expect(createNoteSpyInfo.callCount).toBe(0);

            const allNotes = await page.evaluate(() => window.mockApp.notes.filter({}));
            expect(allNotes.length).toBe(0);
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
            await submitButton.click();
        });

        // Cannot check submitted state as it is instantly changed
        // await allure.step('Verify tool submitted state', async () => {
        //     const submittedState = await waitForCustomEvent(page, 'onToolStateChange');
        //     expect(submittedState).toEqual('submitted');
        // });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=2 notes created successfully');
            const isSuccessMessageVisible = await successMessage.isVisible();
            expect(isSuccessMessageVisible).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API is called and notes are created', async () => {
            const createNoteSpyInfo = await getSpyInfo(page, 'mockApp.createNote');
            expect(createNoteSpyInfo.callCount).toBe(2);    // called twice for 2 notes created

            const allNotes = await page.evaluate(() => window.mockApp.notes.filter({}));
            expect(allNotes.length).toBe(2);
        });

        await allure.step('Verify notes are created with correct name, content and tag', async () => {
            const allNotes = await page.evaluate(() => window.mockApp.notes.filter({}));

            const note1 = allNotes.find(note => note.name === 'Project Documentation');
            expect(note1).toBeDefined();
            expect(note1._content).toBe('# Project Documentation\n\nThis is a placeholder for project documentation.');
            expect(note1.tags).toEqual(['project', 'docs']);

            const note2 = allNotes.find(note => note.name === 'Meeting Notes');
            expect(note2).toBeDefined();
            expect(note2._content).toBe('# Meeting Notes\n\nAgenda items for next meeting:');
            expect(note2.tags).toEqual(['meeting']);
        });

        await allure.step('Verify llm is called with tool results to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result.resultDetail).toBeDefined();
            expect(llmCallData.messages[0].content[0].result.resultDetail.length).toBe(2);
            
            const resultDetail = llmCallData.messages[0].content[0].result.resultDetail;
            expect(resultDetail[0].noteName).toBe('Project Documentation');
            expect(resultDetail[0].noteTags).toEqual(['project', 'docs']);
            expect(resultDetail[0].noteUUID).toBeDefined();
            
            expect(resultDetail[1].noteName).toBe('Meeting Notes');
            expect(resultDetail[1].noteTags).toEqual(['meeting']);
            expect(resultDetail[1].noteUUID).toBeDefined();
        });
    }, 20000);

    it('should transition from init to canceled state without creating notes upon user cancellation', async () => {
        allure.description('Tests that the tool correctly handles user cancellation and does not create notes');

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
                                "toolCallId": "createNotes123",
                                "toolName": "CreateNewNotes",
                                "argsText": '{notes: [{noteName: "Project Documentation", noteTags: ["project", "docs"], noteContent: "# Project Documentation\\n\\nThis is a placeholder for project documentation."}, {noteName: "Meeting Notes", noteTags: ["meeting"], noteContent: "# Meeting Notes\\n\\nAgenda items for next meeting:"}]}',
                                "args": {
                                    "notes": [
                                        {
                                            "noteName": "Project Documentation",
                                            "noteTags": ["project", "docs"],
                                            "noteContent": "# Project Documentation\\n\\nThis is a placeholder for project documentation."
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
                createNote: async (noteName, noteTags) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return await window.mockApp.createNote(noteName, noteTags);
                },
                insertNoteContent: async (note, content) => {
                    return await window.mockApp.insertNoteContent(note.uuid || note, content);
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

        // Cannot check for cancel state as it is instantly changed
        // await allure.step('Verify tool canceled state', async () => {
        //     const canceledState = await waitForCustomEvent(page, 'onToolStateChange');
        //     expect(canceledState).toEqual('canceled');
        // });

        await allure.step('Verify cancel message', async () => {
            const successMessage = await page.waitForSelector('text=canceled');
            const isSuccessMessageVisible = await successMessage.isVisible();
            expect(isSuccessMessageVisible).toBe(true);
            await takeScreenshot(page, 'Cancel message displayed');
        });

        await allure.step('Verify API is not called and no notes are created', async () => {
            const createNoteSpyInfo = await getSpyInfo(page, 'mockApp.createNote');
            expect(createNoteSpyInfo.callCount).toBe(0);

            const allNotes = await page.evaluate(() => window.mockApp.notes.filter({}));
            expect(allNotes.length).toBe(0);
        });

        await allure.step('Verify llm not called when tool is canceled', async () => {
            const sendButton = page.getByRole('button', { name: 'Send' });
            const isSendButtonVisible = await sendButton.isVisible();
            expect(isSendButtonVisible).toBe(true);
        });
    }, 20000);

    it('should handle API error correctly', async () => {
        allure.description('Tests error handling when create note API throws an error');

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
                                "toolCallId": "createNotes123",
                                "toolName": "CreateNewNotes",
                                "argsText": '{notes: [{noteName: "Project Documentation", noteTags: ["project", "docs"], noteContent: "# Project Documentation\\n\\nThis is a placeholder for project documentation."}]}',
                                "args": {
                                    "notes": [
                                        {
                                            "noteName": "Project Documentation",
                                            "noteTags": ["project", "docs"],
                                            "noteContent": "# Project Documentation\\n\\nThis is a placeholder for project documentation."
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
                createNote: async (noteName, noteTags) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Throw an error to simulate API failure
                    throw new Error('Failed to create note');
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
            const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
            await submitButton.click();
        });

        await allure.step('Verify tool transitions to error state', async () => {
            const errorState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(errorState).toEqual('error');
        });

        await allure.step('Verify error message is displayed', async () => {
            const errorMessage = await page.waitForSelector('text=Failed to create note');
            const isErrorMessageVisible = await errorMessage.isVisible();
            expect(isErrorMessageVisible).toBe(true);
            await takeScreenshot(page, 'Error message displayed');
        });

        await allure.step('Verify API was called despite error', async () => {
            const createNoteSpyInfo = await getSpyInfo(page, 'callAmplenotePlugin');
            expect(createNoteSpyInfo.callCount).toBeGreaterThan(0);
        });

        await allure.step('Verify no notes were created due to error', async () => {
            const allNotes = await page.evaluate(() => window.mockApp.notes.filter({}));
            expect(allNotes.length).toBe(0);
        });

        await allure.step('Verify llm is called with tool error to continue answer', async () => {
            const llmCallData = await waitForCustomEvent(page, 'onLLMCallFinish');
            expect(llmCallData.messages[0].content[0].result).toContain('Failed to create note');
        });
    }, 20000);
});

