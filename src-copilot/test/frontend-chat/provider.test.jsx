import { compileJavascriptCode } from "../../../common-utils/compileJavascriptCode.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {EMBED_COMMANDS_MOCK, getLLMProviderSettings} from "./chat.testdata.js";
import html from "inline:../../embed/chat.html";
import {
    createPlaywrightHooks, 
    waitForCustomEvent, 
    takeScreenshot
} from "../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('chat embed', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    describe('works with provider:', () => {
        ['groq', 'openai', 'google', 'fireworks'].forEach(provider => {
            it(provider, async () => {
                allure.description(`Tests chat functionality with ${provider} provider`);
                
                const mockCode = /* javascript */ `
                    import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
                    import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

                    const settings = getLLMProviderSettings('${provider}');
                    window.callAmplenotePlugin = createCallAmplenotePluginMock({
                        ...EMBED_COMMANDS_MOCK,
                        getSettings: async () => {
                            return settings;
                        }
                    });
                `;

                const compiledCode = await compileJavascriptCode(mockCode);
                const htmlWithMocks = addScriptToHtmlString(html, compiledCode);
                const page = await getPage();

                await allure.step(`Setup and load chat embed with ${provider} provider`, async () => {
                    await page.setContent(htmlWithMocks);
                    await waitForCustomEvent(page, 'appLoaded');
                    await takeScreenshot(page, `Chat embed loaded with ${provider} provider`);
                });

                await allure.step('Send message and wait for response', async () => {
                    await page.waitForSelector('.aui-composer-input');
                    await page.locator('.aui-composer-input').fill('Say the five letter word: "Apple". Do not say anything else. Only 5 letters.');
                    await takeScreenshot(page, 'Message typed in composer');
                    
                    await page.getByRole('button', {name: 'Send'}).click();
                    await takeScreenshot(page, 'Send button clicked');
                });

                await allure.step('Verify LLM response contains expected content', async () => {
                    const {messages} = await waitForCustomEvent(page, 'onLLMCallFinish');
                    expect(messages[1].content[0].text).toContain('Apple');
                });

                await allure.step('Verify assistant message is displayed correctly', async () => {
                    await expect(page.locator('.aui-assistant-message-content')).toBeVisible();
                    await expect(page.locator('.aui-assistant-message-content')).toContainText('Apple');
                    await takeScreenshot(page, `Assistant response displayed with ${provider} provider`);
                });
            }, 20000);
        });
    });
});