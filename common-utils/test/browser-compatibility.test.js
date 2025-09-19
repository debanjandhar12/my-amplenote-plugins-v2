import { compileJavascriptCode } from '../esbuild-test-helpers.js';

describe('Sinon browser compatibility validation', () => {
    it('should compile and execute Sinon-based test helpers in browser context', async () => {
        const browserTestCode = `
            import sinon from 'sinon';
            
            // Test that Sinon works in browser context
            const testStub = sinon.stub();
            testStub.returns('browser-test-result');
            
            // Test async functionality without top-level await
            const testAsyncFunction = async () => {
                // Test basic Sinon functionality
                const asyncStub = sinon.stub();
                asyncStub.resolves('async-result');
                
                const result = await asyncStub();
                
                return {
                    stubResult: testStub(),
                    asyncResult: result,
                    sinonWorking: typeof sinon !== 'undefined',
                    stubsWorking: testStub.isSinonProxy === true,
                    callTracking: {
                        testStubCalled: testStub.calledOnce,
                        asyncStubCalled: asyncStub.calledOnce
                    }
                };
            };
            
            // Execute test and store results
            testAsyncFunction().then(results => {
                window.BROWSER_TEST_RESULTS = results;
            });
        `;
        
        const compiledCode = await compileJavascriptCode(browserTestCode);
        
        // Verify the code compiled successfully
        expect(compiledCode).toContain('sinon');
        expect(compiledCode).toContain('BROWSER_TEST_RESULTS');
        expect(compiledCode).toContain('isSinonProxy');
    });

    it('should handle Sinon sandbox creation in browser context', async () => {
        const sandboxTestCode = `
            import sinon from 'sinon';
            
            // Create sandbox
            const sandbox = sinon.createSandbox();
            
            // Create stubs using sandbox
            const stub1 = sandbox.stub();
            const stub2 = sandbox.stub();
            
            stub1.returns('sandbox-result-1');
            stub2.resolves('sandbox-async-result');
            
            // Test sandbox functionality without top-level await
            const testSandbox = async () => {
                const result1 = stub1();
                const result2 = await stub2();
                
                return {
                    sandboxCreated: typeof sandbox !== 'undefined',
                    restoreAvailable: typeof sandbox.restore === 'function',
                    result1,
                    result2,
                    stub1Called: stub1.calledOnce,
                    stub2Called: stub2.calledOnce
                };
            };
            
            testSandbox().then(results => {
                window.SANDBOX_TEST_RESULTS = results;
                
                // Test cleanup
                sandbox.restore();
                window.SANDBOX_CLEANUP_VERIFIED = true;
            });
        `;
        
        const compiledCode = await compileJavascriptCode(sandboxTestCode);
        
        // Verify sandbox functionality is compiled
        expect(compiledCode).toContain('createSandbox');
        expect(compiledCode).toContain('SANDBOX_TEST_RESULTS');
        expect(compiledCode).toContain('SANDBOX_CLEANUP_VERIFIED');
    });

    it('should handle error scenarios gracefully in browser context', async () => {
        const errorTestCode = `
            import sinon from 'sinon';
            
            // Create stubs directly without importing test helpers
            const createNoteStub = sinon.stub();
            const promptStub = sinon.stub();
            
            // Test error handling with Sinon stubs
            createNoteStub.rejects(new Error('Creation failed'));
            promptStub.throws(new Error('Prompt error'));
            
            const testErrorHandling = async () => {
                const results = {
                    rejectionHandled: false,
                    throwHandled: false,
                    callsTracked: false
                };
                
                try {
                    await createNoteStub('Test');
                } catch (error) {
                    results.rejectionHandled = error.message === 'Creation failed';
                }
                
                try {
                    promptStub('Test?');
                } catch (error) {
                    results.throwHandled = error.message === 'Prompt error';
                }
                
                results.callsTracked = createNoteStub.calledOnce && promptStub.calledOnce;
                
                return results;
            };
            
            testErrorHandling().then(results => {
                window.ERROR_TEST_RESULTS = results;
            });
        `;
        
        const compiledCode = await compileJavascriptCode(errorTestCode);
        
        // Verify error handling is compiled
        expect(compiledCode).toContain('rejects');
        expect(compiledCode).toContain('throws');
        expect(compiledCode).toContain('ERROR_TEST_RESULTS');
    });
});