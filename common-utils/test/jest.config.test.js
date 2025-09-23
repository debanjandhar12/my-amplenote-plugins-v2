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
        const mockCode = `
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

    test('custom environment variables should be available in compiled code during test environment', async () => {
        // Set a custom environment variable for testing
        const testEnvKey = 'TEST_CUSTOM_VARIABLE_123';
        const testEnvValue = 'custom-test-value-456';
        process.env[testEnvKey] = testEnvValue;

        try {
            // Create mock code that uses the custom environment variable
            const mockCode = `
                // Test that environment variables are statically replaced during compilation
                window.customEnvValue = process.env.${testEnvKey};
                window.customEnvType = typeof process.env.${testEnvKey};
                window.processEnvExists = typeof process !== 'undefined' && typeof process.env === 'object';
                window.customTestCompleted = true;
            `;

            // Compile the mock code with environment variables
            const compiledCode = await compileJavascriptCode(mockCode);
            
            // Verify the compiled code contains our environment variable value (static replacement)
            expect(compiledCode).toContain(testEnvValue);
            
            // Create an empty HTML page and inject the compiled code
            const emptyHtml = '<html><head><title>Custom Env Test</title></head><body></body></html>';
            const htmlWithMocks = addScriptToHtmlString(emptyHtml, compiledCode);

            // Load the page in playwright
            const page = await getPage();
            await page.setContent(htmlWithMocks);

            // Wait for the test to complete and verify the results
            await page.waitForFunction(() => window.customTestCompleted === true);
            
            const customEnvValue = await page.evaluate(() => window.customEnvValue);
            const customEnvType = await page.evaluate(() => window.customEnvType);
            const processEnvExists = await page.evaluate(() => window.processEnvExists);
            
            // Verify that environment variables are correctly statically replaced during compilation
            expect(customEnvValue).toBe(testEnvValue);
            expect(customEnvType).toBe('string');
            expect(processEnvExists).toBe(true);
        } finally {
            // Clean up the test environment variable
            delete process.env[testEnvKey];
        }
    });
});