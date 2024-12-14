import {chromium} from "playwright";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK, getLLMProviderSettings} from "./chat.testdata.js";
import html from "inline:../../embed/chat.html";

import {
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING, PINECONE_API_KEY_SETTING,
    USER_PROMPT_LIST_SETTING
} from "../../constants.js";

describe('chat embed handles errors correctly', () => {
    it('when empty settings', async () => {
        const browser = await chromium.launch({headless: true});
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({})};
        window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({...EMBED_COMMANDS_MOCK,
            getSettings: async () => {
                return window.INJECTED_SETTINGS;
            }
        }))};
        window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('.error');

        await expect(page.locator('.error')).toMatchText(/.*Error.*/);

        await browser.close();
    }, 20000);
    it('when wrong api key is provided', async () => {
        const browser = await chromium.launch({headless: true});
        const context = await browser.newContext();
        const page = await context.newPage();
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({
            [LLM_API_KEY_SETTING]: "wrong-api-key",
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1/chat/completions",
            [LLM_MODEL_SETTING]: "mixtral-8x7b-32768"
        })};
        window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({...EMBED_COMMANDS_MOCK,
            getSettings: async () => {
                return window.INJECTED_SETTINGS;
            },
            alert: async (...args) => { 
                if (!window.alertcalls)
                    window.alertcalls = [];
                window.alertcalls.push(args.join(' '));
            }
        }))};
        window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
        `);
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('.aui-composer-input');

        await page.locator('.aui-composer-input').fill('Say one word');

        await page.getByRole('button', { name: 'Send' }).click();

        await page.waitForFunction(() => {
            return window.alertcalls && window.alertcalls.length > 0;
        });
        const alertcalls = await page.evaluate(() => window.alertcalls);
        expect(alertcalls[0]).toMatch(/.*invalid.*/i);
    }, 20000);
});

describe('chat embed works with provider:', () => {
    ['groq', 'openai'].forEach(provider => {
        it(provider, async () => {
            const browser = await chromium.launch({headless: true});
            const context = await browser.newContext();
            const page = await context.newPage();
            const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings(provider))};
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({...EMBED_COMMANDS_MOCK,
                getSettings: async () => {
                    return window.INJECTED_SETTINGS;
                }
            }))};
            window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
            `);
            await page.setContent(htmlWithMocks);

            await page.waitForSelector('.aui-composer-input');

            await page.locator('.aui-composer-input').fill('Say a five letter word. Do not say anything else.');

            await page.getByRole('button', { name: 'Send' }).click();

            await page.waitForSelector('.aui-assistant-message-content');

            await new Promise(resolve => setTimeout(resolve, 10000));

            const assistantTextContent = (await page.locator('.aui-assistant-message-content').allTextContents())[0];
            expect(assistantTextContent).not.toBe(null);
            expect(assistantTextContent).not.toBe('');
            expect(assistantTextContent.length).toBe(5);
        }, 20000);
    });
});