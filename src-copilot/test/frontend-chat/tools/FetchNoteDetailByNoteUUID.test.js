import {addScriptToHtmlString} from "../../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from ".././chat.testdata.js";
import html from "inline:../../../embed/chat.html";

import {
    LLM_MAX_TOKENS_SETTING
} from "../../../constants.js";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../../common-utils/playwright-helpers.ts";

describe('Fetch Note Detail By Note UUID tool', () => {
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
                                "toolCallId": "fetchNote123",
                                "toolName": "FetchNoteDetailByNoteUUID",
                                "argsText": '{noteUUIDList: ["12345678-1234-1234-1234-123456789012", "87654321-4321-4321-4321-210987654321"], includeContent: true}',
                                "args": {
                                    "noteUUIDList": [
                                        "12345678-1234-1234-1234-123456789012",
                                        "87654321-4321-4321-4321-210987654321"
                                    ],
                                    "includeContent": true
                                }
                            }
                        ],
                        "metadata": {
                            "custom": {
                                "toolStateStorage": {
                                    "fetchNote123": {
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
                getNoteTitleByUUID: async (uuid) => {
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return "Test Note 1";
                    } else if (uuid === "87654321-4321-4321-4321-210987654321") {
                        return "Test Note 2";
                    }
                    return null;
                },
                getNoteContentByUUID: async (uuid) => {
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return "# Test Note 1\\n\\nThis is the content of test note 1.";
                    } else if (uuid === "87654321-4321-4321-4321-210987654321") {
                        return "# Test Note 2\\n\\nThis is the content of test note 2.";
                    }
                    return "";
                },
                getNoteBacklinksByUUID: async ({uuid}) => {
                    // Add small delay to simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return ["backlink-uuid-1", "backlink-uuid-2"];
                    } else if (uuid === "87654321-4321-4321-4321-210987654321") {
                        return ["backlink-uuid-3"];
                    }
                    return [];
                },
                getNoteTagsByUUID: async ({uuid}) => {
                    // Add small delay to simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (uuid === "12345678-1234-1234-1234-123456789012") {
                        return ["tag1", "tag2"];
                    } else if (uuid === "87654321-4321-4321-4321-210987654321") {
                        return ["tag3"];
                    }
                    return [];
                }
            }))};
        `);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        // Wait for the tool to initialize
        const initState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(initState).toEqual('init');

        // Wait for the tool to complete (read-only tool, no user input required)
        const completedState = await waitForCustomEvent(page, 'onToolStateChange');
        expect(completedState).toEqual('completed');

        // Check if the success message is visible
        const successMessage = await page.waitForSelector('text=Note info fetched successfully');
        const isSuccessMessageVisible = await successMessage.isVisible();
        expect(isSuccessMessageVisible).toBe(true);
    }, 20000);
});
