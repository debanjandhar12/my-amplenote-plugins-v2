import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK, getLLMProviderSettings} from "./chat.testdata.js";
import html from "inline:../../embed/chat.html";

import {
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING, LLM_MAX_TOKENS_SETTING,
    LLM_MODEL_SETTING
} from "../../constants.js";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";


describe('chat embed', () => {
    const {getPage} = createPlaywrightHooks(false);
    describe('handles errors correctly', () => {
        it('when empty settings', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({})};
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({...EMBED_COMMANDS_MOCK,
                getSettings: async () => {
                    return window.INJECTED_SETTINGS;
                }
            }))};
            window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
            `);
            const page = await getPage();
            await page.setContent(htmlWithMocks);

            await waitForCustomEvent(page, 'appLoaded');

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText('Error');
        }, 20000);

        it('when wrong api key is provided', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({
                ...getLLMProviderSettings('groq'),
                [LLM_API_KEY_SETTING]: "wrong-api-key"
            })};
            window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({...EMBED_COMMANDS_MOCK,
                getSettings: async () => {
                    return window.INJECTED_SETTINGS;
                }
            }))};
            window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
            `);
            const page = await getPage();
            await page.setContent(htmlWithMocks);

            await waitForCustomEvent(page, 'appLoaded');
            await page.waitForSelector('.aui-composer-input');
            await page.locator('.aui-composer-input').fill('Say one word');
            await page.getByRole('button', { name: 'Send' }).click();

            const [funcName, ...args] = await waitForCustomEvent(page, 'callAmplenotePlugin');
            expect(funcName).toBe('alert');
            await expect(args[0].toLowerCase()).toContain('invalid');
        }, 20000);
    });

    it('loads correctly', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
        window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
            ...EMBED_COMMANDS_MOCK,
            getSettings: async () => {
                return window.INJECTED_SETTINGS;
            }
        }))};
        window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
        `);
        const page = getPage();
        await page.setContent(htmlWithMocks);
        await waitForCustomEvent(page, 'appLoaded');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await expect(page.locator('.aui-composer-input')).toBeVisible();
    }, 20000);

    it('works with custom max token setting', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        })};
        window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
            ...EMBED_COMMANDS_MOCK,
            getSettings: async () => {
                return window.INJECTED_SETTINGS;
            }
        }))};
        window.INJECTED_USER_DATA_MOCK = ${JSON.stringify(serializeWithFunctions(EMBED_USER_DATA_MOCK))};
        `);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await page.waitForSelector('.aui-composer-input');
        await page.locator('.aui-composer-input').fill('Say the five letter word: "Apple". Do not say anything else. Only 5 letters.');
        await page.getByRole('button', {name: 'Send'}).click();

        const {messages} = await waitForCustomEvent(page, 'onLLMCallFinish');
        expect(messages[1].content[0].text).toContain('Apple');

        await expect(page.locator('.aui-assistant-message-content')).toBeVisible();
        await expect(page.locator('.aui-assistant-message-content')).toContainText('Apple');
    }, 20000);
});