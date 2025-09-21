import { compileJavascriptCode } from "../../../../common-utils/esbuild-test-helpers.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import html from "inline:../../../embed/chat.html";
import {
    createPlaywrightHooks, getSpyInfo,
    waitForCustomEvent, takeScreenshot
} from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Edit Note Content tool', () => {
    const { getPage } = createPlaywrightHooks(false);

    it('should transition from init to completed state and edit note content upon user confirmation', async () => {
        allure.epic('src-copilot');
        allure.description('Tests the complete flow of editing note content through the chat interface');

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
                                "toolCallId": "editNote123",
                                "toolName": "EditNoteContent",
                                "args": {
                                    "noteUUID": "note-uuid-1",
                                    "editInstruction": "Add a conclusion section"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "editNote123": {
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

            window.mockApp = mockApp(mockNote("# Test Note\\n\\nThis is the original content.", "Test Note", "note-uuid-1"));

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
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.content() : null;
                },
                "getUserCurrentNoteData": async () => {
                    return {
                        currentNoteUUID: window.mockApp.context.noteUUID
                    }
                },
                replaceNoteContent: async (note, content) => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await window.mockApp.replaceNoteContent(note.uuid || note, content);
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
            const submitButton = await page.waitForSelector('button:has-text("Update Content")');
            const isSubmitButtonVisible = await submitButton.isVisible();
            expect(isSubmitButtonVisible).toBe(true);

            const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
            const isCancelButtonVisible = await cancelButton.isVisible();
            expect(isCancelButtonVisible).toBe(true);

            const noteSelector = await page.waitForSelector('button:has-text("Test Note")');
            const isNoteSelectorVisible = await noteSelector.isVisible();
            expect(isNoteSelectorVisible).toBe(true);
        });

        await allure.step('Verify API is not called before submit click', async () => {
            const replaceNoteContentSpyInfo = await getSpyInfo(page, 'mockApp.replaceNoteContent');
            expect(replaceNoteContentSpyInfo.callCount).toBe(0);
        });

        await allure.step('Click submit button', async () => {
            const submitButton = await page.waitForSelector('button:has-text("Update Content")');
            await submitButton.click();
        });

        await allure.step('Verify tool completed state', async () => {
            const completedState = await waitForCustomEvent(page, 'onToolStateChange');
            expect(completedState).toEqual('completed');
        });

        await allure.step('Verify success message', async () => {
            const successMessage = await page.waitForSelector('text=Test Note note content updated');
            const isSuccessMessageVisible = await successMessage.isVisible();
            expect(isSuccessMessageVisible).toBe(true);
            await takeScreenshot(page, 'Success message displayed');
        });

        await allure.step('Verify API is called and note content is updated', async () => {
            const replaceNoteContentSpyInfo = await getSpyInfo(page, 'mockApp.replaceNoteContent');
            expect(replaceNoteContentSpyInfo.callCount).toBe(1);

            const note = await page.evaluate(() => window.mockApp.findNote("note-uuid-1"));
            expect(note._content).not.toBe('# Test Note\n\nThis is the original content.');
        });
    }, 20000);

    it('should transition from init to canceled state without editing note content upon user cancellation', async () => {
        allure.epic('src-copilot');
        allure.description('Tests that the tool correctly handles user cancellation and does not edit note content');

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
                                "toolCallId": "editNote123",
                                "toolName": "EditNoteContent",
                                "args": {
                                    "noteUUID": "note-uuid-1",
                                    "editInstruction": "Add a conclusion section"
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "editNote123": {
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

            window.mockApp = mockApp(mockNote("# Test Note\\n\\nThis is the original content.", "Test Note", "note-uuid-1"));

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
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.name : null;
                },
                getNoteContentByUUID: async (uuid) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const note = await window.mockApp.findNote(uuid);
                    return note ? note.content() : null;
                },
                "getUserCurrentNoteData": async () => {
                    return {
                        currentNoteUUID: window.mockApp.context.noteUUID
                    }
                },
                replaceNoteContent: async (note, content) => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await window.mockApp.replaceNoteContent(note.uuid || note, content);
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
            const submitButton = await page.waitForSelector('button:has-text("Update Content")');
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

        await allure.step('Verify API is not called and note content is not updated', async () => {
            const replaceNoteContentSpyInfo = await getSpyInfo(page, 'mockApp.replaceNoteContent');
            expect(replaceNoteContentSpyInfo.callCount).toBe(0);

            const note = await page.evaluate(() => window.mockApp.findNote("note-uuid-1"));
            expect(note._content).toBe('# Test Note\n\nThis is the original content.');
        });
    }, 20000);
});