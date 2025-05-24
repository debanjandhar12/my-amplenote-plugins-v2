import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from "./chat.testdata.js";
import html from "inline:../../embed/chat.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";

describe('chat embed', () => {
    const {getPage} = createPlaywrightHooks();

    describe('works with provider:', () => {
        ['groq', 'openai', 'google', 'fireworks'].forEach(provider => {
            it(provider, async () => {
                const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings(provider))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
                    ...EMBED_COMMANDS_MOCK,
                    getSettings: async () => {
                        return window.INJECTED_SETTINGS;
                    }
                }))};
                `);
                const page = await getPage();
                await page.setContent(htmlWithMocks);

                await waitForCustomEvent(page, 'appLoaded');

                await page.waitForSelector('.aui-composer-input');
                await page.locator('.aui-composer-input').fill('Say the five letter word: "Apple". Do not say anything else. Only 5 letters.');
                await page.getByRole('button', {name: 'Send'}).click();

                const {messages} = await waitForCustomEvent(page, 'onLLMCallFinish');
                expect(messages[1].content[0].text).toContain('Apple');

                await expect(page.locator('.aui-assistant-message-content')).toBeVisible();
                await expect(page.locator('.aui-assistant-message-content')).toContainText('Apple');
            }, 20000);
        });
    });
});