/**
 * Test to verify process.env.NODE_ENV behavior in jest and playwright environment
 */

import {allure} from "jest-allure2-reporter/api";
import { compileJavascriptCode } from "../compileJavascriptCode.js";
import { addScriptToHtmlString } from "../embed-helpers.js";
import { createPlaywrightHooks } from "../playwright-helpers.ts";

describe('Environment Variable Verification', () => {
    const { getPage } = createPlaywrightHooks();
    
    beforeEach(() => {
        allure.epic('common-utils');
    });

    test('process.env.NODE_ENV should be "test" in jest environment', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });

    test('process.env.NODE_ENV should be "test" in playwright environment when using compileJavascriptCode', async () => {
        
        // Create mock code that will check process.env.NODE_ENV in the browser
        const mockCode = /* javascript */ `
            // Store the NODE_ENV value for verification
            window.testNodeEnv = process.env.NODE_ENV;
            window.testCompleted = true;
        `;

        // Compile the mock code with environment variables
        const compiledCode = await compileJavascriptCode(mockCode);
        
        // Create an empty HTML page and inject the compiled code
        const emptyHtml = '<html><head><title>Test</title></head><body></body></html>';
        const htmlWithMocks = addScriptToHtmlString(emptyHtml, compiledCode);

        // Load the page in playwright
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        // Wait for the test to complete and verify the result
        await page.waitForFunction(() => window.testCompleted === true);
        const nodeEnvValue = await page.evaluate(() => window.testNodeEnv);
        
        expect(nodeEnvValue).toBe('test');
    });
});