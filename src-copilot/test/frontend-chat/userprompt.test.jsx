import { compileJavascriptCode } from "../../../common-utils/compileJavascriptCode.js";
import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import html from "inline:../../embed/chat.html";
import {
    createPlaywrightHooks, 
    waitForCustomEvent, 
    takeScreenshot
} from "../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('chat embed user prompts', () => {
    const { getPage } = createPlaywrightHooks();
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('loads with empty user prompt list setting', async () => {
        allure.description('Tests loading user prompt library with empty user prompt list setting');
        const mockCode = /* javascript */ `
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

        await allure.step('Setup and load chat embed', async () => {
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');
            await takeScreenshot(page, 'Chat embed loaded');
        });

        await allure.step('Verify user prompt library button is visible', async () => {
            await expect(page.locator('.user-prompt-library-button')).toBeVisible();
            await takeScreenshot(page, 'User prompt library button visible');
        });

        await allure.step('Click user prompt library button and verify add button appears', async () => {
            await page.locator('.user-prompt-library-button').click();
            await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
            await takeScreenshot(page, 'User prompt library opened with add button');
        });
    }, 20000);

    it('loads with non-empty user prompt list setting and works', async () => {
        allure.description('Tests loading user prompt library with existing prompts and verifying functionality');
        const mockCode = /* javascript */ `
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

        await allure.step('Setup and load chat embed with predefined prompts', async () => {
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');
            await takeScreenshot(page, 'Chat embed loaded with predefined prompts');
        });

        await allure.step('Verify user prompt library button is visible', async () => {
            await expect(page.locator('.user-prompt-library-button')).toBeVisible();
            await takeScreenshot(page, 'User prompt library button visible');
        });

        await allure.step('Open user prompt library and verify content', async () => {
            await page.locator('.user-prompt-library-button').click();
            await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
            await expect(page.locator('.user-prompt-card')).toHaveCount(2);
            await takeScreenshot(page, 'User prompt library opened with 2 prompt cards');
        });

        await allure.step('Select first prompt and verify it appears in composer', async () => {
            await page.locator('.user-prompt-card').nth(0).click();
            await expect(page.locator('.aui-composer-input')).toContainText('Test A');
            await takeScreenshot(page, 'First prompt selected and displayed in composer');
        });
    }, 20000);
});