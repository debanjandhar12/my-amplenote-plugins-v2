import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import { serializeWithFunctions } from "../../../../common-utils/embed-comunication.js";
import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from "../chat.testdata.js";
import html from "inline:../../../embed/chat.html";

import {
    LLM_MAX_TOKENS_SETTING
} from "../../../constants.js";
import { createPlaywrightHooks } from "../../../../common-utils/playwright-helpers.ts";

describe('makeCustomMarkdownText component', () => {
    const { getPage } = createPlaywrightHooks();

    it('displays code blocks correctly', async () => {
        const codeBlockMessage = {
            "id": "code-test-123",
            "role": "assistant",
            "status": {
                "type": "complete"
            },
            "content": [
                {
                    "type": "text",
                    "text": "Here's a JavaScript example:\n\n```javascript\nfunction greet(name) {\n    console.log(`Hello, ${name}!`);\n    return `Welcome ${name}`;\n}\n```"
                }
            ],
            "createdAt": "2025-05-24T10:00:00.000Z"
        };

        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        })};

            window.INJECT_MESSAGES = [
                {
                    "message": ${JSON.stringify(codeBlockMessage)},
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
                    return { type: 'new-chat', message: injectMessages };
                }
                return null;
            }
        }))};
        `);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('pre', { timeout: 10000 });
        const codeBlock = await page.$eval('pre code', el => el.textContent);
        expect(codeBlock).toContain('function greet(name)');
    }, 20000);

    it('displays markdown tables correctly', async () => {
        const tableMessage = {
            "id": "table-test-123",
            "role": "assistant",
            "status": {
                "type": "complete"
            },
            "content": [
                {
                    "type": "text",
                    "text": "Here's a table:\n\n| Name | Age | City |\n|------|-----|------|\n| Alice | 30 | New York |\n| Bob | 25 | London |"
                }
            ],
            "createdAt": "2025-05-24T10:00:00.000Z"
        };

        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        })};

            window.INJECT_MESSAGES = [
                {
                    "message": ${JSON.stringify(tableMessage)},
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
                    return { type: 'new-chat', message: injectMessages };
                }
                return null;
            }
        }))};
        `);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('table', { timeout: 10000 });
        const tableHeaders = await page.$$eval('table th', headers =>
            headers.map(th => th.textContent.trim())
        );
        expect(tableHeaders).toEqual(['Name', 'Age', 'City']);
    }, 20000);

    it('displays tool group mentions correctly', async () => {
        const toolGroupMessage = {
            "id": "toolgroup-test-123",
            "role": "assistant",
            "status": {
                "type": "complete"
            },
            "content": [
                {
                    "type": "text",
                    "text": "You can use @web tools to search the internet or @notes tools to work with your notes."
                }
            ],
            "createdAt": "2025-05-24T10:00:00.000Z"
        };

        const htmlWithMocks = addScriptToHtmlString(html, `
            window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        })};

            window.INJECT_MESSAGES = [
                {
                    "message": ${JSON.stringify(toolGroupMessage)},
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
                    return { type: 'new-chat', message: injectMessages };
                }
                return null;
            }
        }))};
        `);

        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('.tool_group_mention', { timeout: 10000 });
        const toolMentions = await page.$$eval('.tool_group_mention', mentions =>
            mentions.map(mention => mention.textContent.trim())
        );
        expect(toolMentions).toEqual(['@web', '@notes']);
    }, 20000);
});