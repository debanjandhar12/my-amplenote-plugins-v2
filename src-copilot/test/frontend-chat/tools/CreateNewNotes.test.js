import {addCompiledMocksToHtml} from "../../../../common-utils/esbuild-test-helpers.js";
import html from "inline:../../../embed/chat.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";

describe('Create New Notes tool', () => {
    const {getPage} = createPlaywrightHooks();
    
    it('works correctly through all states', async () => {
        // Mock code with imports - this will be compiled by esbuild for real
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from '../chat.testdata.js';
            import { LLM_MAX_TOKENS_SETTING } from '../../constants.js';

            // Mock settings using imports
            const mockSettings = {
                ...getLLMProviderSettings('groq'),
                [LLM_MAX_TOKENS_SETTING]: '100'
            };

            // Mock messages
            const mockMessages = [
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

            // Mock embed commands using native JavaScript functions and imports
            const mockEmbedCommands = {
                ...EMBED_COMMANDS_MOCK,
                getSettings: async () => mockSettings,
                receiveMessageFromPlugin: async (queue) => {
                    if (queue === 'attachments' && window.INJECT_MESSAGES) {
                        const injectMessages = window.INJECT_MESSAGES;
                        window.INJECT_MESSAGES = null;
                        return {type: 'new-chat', message: injectMessages};
                    }
                    return null;
                },
                createNote: async (noteName, noteTags) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return "note-uuid-" + Math.random().toString(36).substring(2, 15);
                },
                insertNoteContent: async (note, content) => {
                    return true;
                }
            };

            // Global setup
            window.INJECTED_SETTINGS = mockSettings;
            window.INJECT_MESSAGES = mockMessages;
            window.INJECTED_EMBED_COMMANDS_MOCK = mockEmbedCommands;
        `;

        const htmlWithMocks = await addCompiledMocksToHtml(html, mockCode);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        // Wait for the tool to initialize
        const initState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(initState).toEqual('init');

        // Cannot check waiting state as it is instantly changed
        // const waitingState = await waitForCustomEvent(page, 'onToolStateChange');
        // expect(waitingState).toEqual('waitingForUserInput');

        // Check if the submit button exists and is visible
        const submitButton = await page.waitForSelector('button:has-text("Create Notes")');
        const isSubmitButtonVisible = await submitButton.isVisible();
        expect(isSubmitButtonVisible).toBe(true);

        // Check if the cancel button exists and is visible
        const cancelButton = await page.waitForSelector('button:has-text("Cancel")');
        const isCancelButtonVisible = await cancelButton.isVisible();
        expect(isCancelButtonVisible).toBe(true);

        // Simulate user clicking the submit button
        await submitButton.click();

        // Cannot check submitted state as it is instantly changed
        // const submittedState = await waitForCustomEvent(page, 'onToolStateChange');
        // expect(submittedState).toEqual('submitted');

        // Wait for the tool to complete
        const completedState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(completedState).toEqual('completed');

        // Check if the success message is visible
        const successMessage = await page.waitForSelector('text=2 notes created successfully');
        const isSuccessMessageVisible = await successMessage.isVisible();
        expect(isSuccessMessageVisible).toBe(true);
    }, 20000);
});