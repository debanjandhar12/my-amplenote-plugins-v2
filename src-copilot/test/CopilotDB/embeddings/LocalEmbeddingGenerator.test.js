import { compileJavascriptCode } from "../../../../common-utils/compileJavascriptCode.js";
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import { createPlaywrightHooks } from "../../../../common-utils/playwright-helpers.ts";
import { allure } from 'jest-allure2-reporter/api';

describe('Local Embedding', () => {
    const { getPage } = createPlaywrightHooks();
    
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should throw error when worker not supported', async () => {
        allure.description('Tests that LocalEmbeddingGenerator throws error when Worker is not supported');

        const mockCode = /* javascript */ `
            import { LocalEmbeddingGenerator } from './src-copilot/CopilotDB/embeddings/LocalEmbeddingGenerator.js';
            import { mockApp } from "./common-utils/amplenote-mocks.js";
            import sinon from 'sinon';

            window.testResult = null;
            window.testError = null;
            window.sinon = sinon;

            // Set Worker as undefined to simulate unsupported environment
            const originalWorker = window.Worker;
            window.Worker = undefined;

            (async () => {
                try {
                    const generator = new LocalEmbeddingGenerator();
                    const app = mockApp();
                    
                    await generator.generateEmbedding(app, ["test text"], 'query');
                    window.testResult = "should not reach here";
                } catch (error) {
                    window.testError = error.message;
                } finally {
                    // Restore original Worker
                    window.Worker = originalWorker;
                }
            })();
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString('<html><body></body></html>', compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Wait for test completion and verify error', async () => {
            await page.waitForFunction(() => window.testError !== null, { timeout: 10000 });
            
            const testError = await page.evaluate(() => window.testError);
            const testResult = await page.evaluate(() => window.testResult);
            
            expect(testResult).toBeNull();
            expect(testError).toContain("Worker is not supported in current browser");
        });
    }, 15000);

    it('should work correctly with array of strings', async () => {
        allure.description('Tests that LocalEmbeddingGenerator works correctly with array input and produces correct output shape');

        const mockCode = /* javascript */ `
            import { LocalEmbeddingGenerator } from './src-copilot/CopilotDB/embeddings/LocalEmbeddingGenerator.js';
            import { mockApp } from "./common-utils/amplenote-mocks.js";
            import sinon from 'sinon';

            window.testResult = null;
            window.testError = null;
            window.sinon = sinon;

            // Create spies to track method calls
            window.generateEmbeddingSpy = sinon.spy();

            (async () => {
                try {
                    const generator = new LocalEmbeddingGenerator();
                    const app = mockApp();
                    
                    // Spy on the generateEmbedding method
                    const originalGenerateEmbedding = generator.generateEmbedding.bind(generator);
                    generator.generateEmbedding = async (...args) => {
                        window.generateEmbeddingSpy(...args);
                        return await originalGenerateEmbedding(...args);
                    };
                    
                    const inputArray = ["Hello world", "Test embedding"];
                    const result = await generator.generateEmbedding(app, inputArray, 'query');
                    
                    window.testResult = {
                        resultLength: result.length,
                        isArray: Array.isArray(result),
                        firstItemIsFloat32Array: result[0] instanceof Float32Array,
                        secondItemIsFloat32Array: result[1] instanceof Float32Array,
                        firstItemLength: result[0].length,
                        secondItemLength: result[1].length,
                        spyCallCount: window.generateEmbeddingSpy.callCount,
                        spyArgs: window.generateEmbeddingSpy.getCall(0)?.args
                    };
                } catch (error) {
                    window.testError = error.message;
                }
            })();
        `;

        const compiledCode = await compileJavascriptCode(mockCode);
        const htmlWithMocks = addScriptToHtmlString('<html><body></body></html>', compiledCode);
        const page = await getPage();
        await page.setContent(htmlWithMocks);

        await allure.step('Wait for test completion and verify results', async () => {
            await page.waitForFunction(() => window.testResult !== null || window.testError !== null, { timeout: 15000 });
            
            const testError = await page.evaluate(() => window.testError);
            const testResult = await page.evaluate(() => window.testResult);
            
            expect(testError).toBeNull();
            expect(testResult).not.toBeNull();
        });

        await allure.step('Verify output shape and method calls', async () => {
            const testResult = await page.evaluate(() => window.testResult);
            
            // Verify output shape
            expect(testResult.resultLength).toBe(2);
            expect(testResult.isArray).toBe(true);
            expect(testResult.firstItemIsFloat32Array).toBe(true);
            expect(testResult.secondItemIsFloat32Array).toBe(true);
            expect(testResult.firstItemLength).toBeGreaterThan(0);
            expect(testResult.secondItemLength).toBeGreaterThan(0);
            
            // Verify method was called correctly
            expect(testResult.spyCallCount).toBe(1);
            expect(testResult.spyArgs).toHaveLength(3);
            expect(testResult.spyArgs[1]).toEqual(["Hello world", "Test embedding"]);
            expect(testResult.spyArgs[2]).toBe('query');
        });
    }, 20000);
});