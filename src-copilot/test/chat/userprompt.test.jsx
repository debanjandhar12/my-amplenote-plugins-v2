import {addScriptToHtmlString} from "../../../common-utils/embed-helpers.js";
import {serializeWithFunctions} from "../../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK, EMBED_USER_DATA_MOCK, getLLMProviderSettings} from "./chat.testdata.js";
import html from "inline:../../embed/chat.html";
import {createPlaywrightHooks, waitForCustomEvent} from "../../../common-utils/playwright-helpers.ts";
import {USER_PROMPT_LIST_SETTING} from "../../constants.js";

describe('chat embed user prompts', () => {
    const {getPage} = createPlaywrightHooks();

    it('loads with empty user prompt list setting', async () => {
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
        await expect(page.locator('.user-prompt-library-button')).toBeVisible();
        await page.locator('.user-prompt-library-button').click();
        await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
    }, 20000);

    it('loads with non-empty user prompt list setting and works', async () => {
        const htmlWithMocks = addScriptToHtmlString(html, `window.INJECTED_SETTINGS = ${JSON.stringify({
            ...getLLMProviderSettings('groq'),
            [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}])
        })};
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
        await expect(page.locator('.user-prompt-library-button')).toBeVisible();
        await page.locator('.user-prompt-library-button').click();
        await expect(page.locator('.user-prompt-library-add-button')).toBeVisible();
        await expect(page.locator('.user-prompt-card')).toHaveCount(2);
        await page.locator('.user-prompt-card').nth(0).click();
        await expect(page.locator('.aui-composer-input')).toContainText('Test A');
    }, 20000);
});