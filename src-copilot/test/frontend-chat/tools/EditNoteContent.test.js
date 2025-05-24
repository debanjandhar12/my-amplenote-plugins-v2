import {addScriptToHtmlString} from "../../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from ".././chat.testdata.js";
import html from "inline:../../../embed/chat.html";

import {
    LLM_MAX_TOKENS_SETTING
} from "../../../constants.js";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";

describe('Edit Note Content tool', () => {
    const {getPage} = createPlaywrightHooks();

    it('works correctly through all states', async () => {
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
                                "toolCallId": "editNote123",
                                "toolName": "EditNoteContent",
                                "argsText": '{noteUUID: "12345678-1234-1234-1234-123456789012", editInstruction: "Add a conclusion section"}',
                                "args": {
                                    "noteUUID": "12345678-1234-1234-1234-123456789012",
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

            // Mock the LLM generation by injecting into the page context
            window.mockLLMGeneration = true;
            window.mockGeneratedContent = "# Test Note\\n\\nThis is the original content.\\n\\n## Conclusion\\n\\nThis is the added conclusion section.";

            // Override LLM functions in the global scope
            window.getLLMModel = async (appSettings) => {
                return { mockModel: true };
            };

            window.generateText = async (model, prompt) => {
                // Add small delay to simulate LLM generation
                await new Promise(resolve => setTimeout(resolve, 500));
                return { text: window.mockGeneratedContent };
            };

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
                getNoteTitleByUUID: async (uuid) => {
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return "Test Note";
                    }
                    return null;
                },
                getNoteContentByUUID: async (uuid) => {
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return "# Test Note\\n\\nThis is the original content.";
                    }
                    return "";
                },
                replaceNoteContent: async ({uuid}, content) => {
                    // Add timeout so that test can capture state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return true;
                }
            }))};
        `);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        // Wait for the tool to initialize
        const initState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(initState).toEqual('init');

        // Cannot check waiting state as it is instantly changed
        // const waitingState = await waitForCustomEvent(page, 'onToolStateChange');
        // expect(waitingState).toEqual('waitingForUserInput');

        // Check if the submit button exists and is visible
        const submitButton = await page.waitForSelector('button:has-text("Update Content")');
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
        const successMessage = await page.waitForSelector('text=Test Note note content updated');
        const isSuccessMessageVisible = await successMessage.isVisible();
        expect(isSuccessMessageVisible).toBe(true);
    }, 20000);
});
