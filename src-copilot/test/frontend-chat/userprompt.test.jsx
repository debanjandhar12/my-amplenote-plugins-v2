import { compileJavascriptCode } from "../../../common-utils/esbuild-test-helpers.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import html from "inline:../../embed/chat.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";

describe('chat embed user prompts', () => {
    const {getPage} = createPlaywrightHooks();

    it('loads with empty user prompt list setting', async () => {
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            const settings = getLLMProviderSettings('groq');
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
        await page.setContent(htmlWithMocks);
        await waitForCustomEvent(page, 'appLoaded');
        await expect(page.locator('.user-prompt-library-button')).toBeVisible();
        await page.locator('.user-prompt-library-button').click();
        await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
    }, 20000);

    it('loads with non-empty user prompt list setting and works', async () => {
        const mockCode = `
            import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from './src-copilot/test/frontend-chat/chat.testdata.js';
            import { USER_PROMPT_LIST_SETTING } from './src-copilot/constants.js';
            import { createCallAmplenotePluginMock } from "./common-utils/embed-comunication.js";

            const settings = {
                ...getLLMProviderSettings('groq'),
                [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}])
            };
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
        await page.setContent(htmlWithMocks);
        await waitForCustomEvent(page, 'appLoaded');
        await expect(page.locator('.user-prompt-library-button')).toBeVisible();
        await page.locator('.user-prompt-library-button').click();
        await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
        await expect(page.locator('.user-prompt-card')).toHaveCount(2);
        await page.locator('.user-prompt-card').nth(0).click();
        await expect(page.locator('.aui-composer-input')).toContainText('Test A');
    }, 20000);
});