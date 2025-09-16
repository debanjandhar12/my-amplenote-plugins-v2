import { jest } from '@jest/globals';
import { compileJavascriptCode } from '../esbuild-test-helpers.js';

describe('esbuild-test-helpers', () => {
    describe('compileJavascriptCode', () => {
        it('should compile basic JavaScript without imports', async () => {
            const code = `
                window.TEST_VALUE = 'hello world';
                console.log('Mock loaded');
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('TEST_VALUE');
            expect(result).toContain('hello world');
            expect(result).toContain('Mock loaded');
        });

        it('should compile JavaScript with import statements', async () => {
            const code = `
                import { readFileSync } from 'fs';
                
                window.TEST_IMPORT = 'imported successfully';
                window.FS_AVAILABLE = typeof readFileSync;
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('TEST_IMPORT');
            expect(result).toContain('imported successfully');
            expect(result).toContain('FS_AVAILABLE');
        });

        it('should handle native JavaScript functions without serialization', async () => {
            const code = `
                window.MOCK_FUNCTIONS = {
                    asyncFunction: async (param) => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        return 'async result: ' + param;
                    },
                    regularFunction: (a, b) => a + b,
                    arrowFunction: () => 'arrow result'
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('asyncFunction');
            expect(result).toContain('regularFunction');
            expect(result).toContain('arrowFunction');
            expect(result).toContain('async result');
            expect(result).toContain('arrow result');
        });

        it('should unwrap IIFE format automatically', async () => {
            const code = `window.TEST = 'iife test';`;
            
            const result = await compileJavascriptCode(code);
            
            // Should be unwrapped, not wrapped in IIFE
            expect(result).not.toMatch(/^\(\(\) => \{[\s\S]*\}\)\(\);?$/);
            expect(result).not.toMatch(/^\(function\(\) \{[\s\S]*\}\)\(\);?$/);
            expect(result).toContain('TEST');
            expect(result).toContain('iife test');
        });

        it('should handle IIFE unwrapping edge cases', async () => {
            const code = `
                window.COMPLEX_TEST = {
                    value: 'test',
                    fn: () => 'arrow function'
                };
                console.log('IIFE unwrapping test');
            `;
            
            const result = await compileJavascriptCode(code);
            
            // Log the actual result to debug
            console.log('Compiled result starts with:', result.substring(0, 50));
            console.log('Compiled result ends with:', result.substring(result.length - 50));
            
            // Should be unwrapped
            expect(result).not.toMatch(/^\(\(\) => \{/);
            expect(result).not.toMatch(/^\(function\(\) \{/);
            expect(result).not.toMatch(/\}\)\(\);?$/);
            
            // Should contain the actual code
            expect(result).toContain('COMPLEX_TEST');
            expect(result).toContain('arrow function');
            expect(result).toContain('IIFE unwrapping test');
        });

        it('should handle compilation with external dependencies', async () => {
            const code = `
                import React from 'react';
                window.EXTERNAL_REACT = React;
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('EXTERNAL_REACT');
        });

        it('should handle complex objects without JSON.stringify limitations', async () => {
            const code = `
                const complexObject = {
                    functions: {
                        asyncFn: async () => 'async result',
                        regularFn: function() { return 'regular result'; },
                        arrowFn: () => 'arrow result'
                    },
                    symbols: Symbol('test'),
                    undefined: undefined,
                    null: null,
                    nested: {
                        deep: {
                            value: 'nested value'
                        }
                    }
                };
                
                window.COMPLEX_OBJECT = complexObject;
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('asyncFn');
            expect(result).toContain('regularFn');
            expect(result).toContain('arrowFn');
            expect(result).toContain('Symbol(');
            expect(result).toContain('undefined');
            expect(result).toContain('nested value');
        });

        it('should handle multiple import statements and dependency resolution', async () => {
            const code = `
                import { readFileSync } from 'fs';
                import { join } from 'path';
                
                window.MULTIPLE_IMPORTS = {
                    readFileSync: typeof readFileSync,
                    join: typeof join
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('MULTIPLE_IMPORTS');
            expect(result).toContain('readFileSync');
            expect(result).toContain('join');
        });

        it('should provide descriptive error messages for syntax errors', async () => {
            const invalidCode = `
                window.TEST = 'unclosed string;
                const invalid = {;
            `;
            
            await expect(compileJavascriptCode(invalidCode)).rejects.toThrow(/Code compilation failed/);
        });

        it('should provide helpful error messages for import resolution failures', async () => {
            const codeWithBadImport = `
                import { nonExistentFunction } from './non-existent-file.js';
                window.TEST = nonExistentFunction();
            `;
            
            await expect(compileJavascriptCode(codeWithBadImport)).rejects.toThrow(/Code compilation failed/);
        });

        it('should handle Node.js modules with polyfill', async () => {
            const code = `
                import { createHash } from 'crypto';
                import { join } from 'path';
                
                const hash = createHash('sha256');
                hash.update('test data');
                const hashResult = hash.digest('hex');
                
                const filePath = join('folder', 'file.txt');
                
                window.NODE_MODULES_TEST = {
                    hashResult,
                    filePath
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('NODE_MODULES_TEST');
            expect(result).toContain('hashResult');
            expect(result).toContain('filePath');
        });

        it('should handle Node.js modules as external dependencies', async () => {
            const code = `
                import { createHash } from 'crypto';
                import { join } from 'path';
                
                window.NODE_MODULES_EXTERNAL = {
                    createHash: typeof createHash,
                    join: typeof join
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('NODE_MODULES_EXTERNAL');
        });

        it('should properly bundle Sinon for browser environments', async () => {
            const code = `
                import sinon from 'sinon';
                
                // Create Sinon stubs and spies
                const mockFunction = sinon.stub();
                mockFunction.returns('test-value');
                
                const spy = sinon.spy();
                
                // Test Sinon functionality
                const result = mockFunction();
                spy('called');
                
                window.SINON_TEST = {
                    sinonAvailable: typeof sinon !== 'undefined',
                    stubResult: result,
                    stubCalled: mockFunction.called,
                    spyCalled: spy.called,
                    stubCallCount: mockFunction.callCount,
                    spyCallCount: spy.callCount
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('SINON_TEST');
            expect(result).toContain('sinonAvailable');
            expect(result).toContain('stubResult');
            expect(result).toContain('stubCalled');
            expect(result).toContain('spyCalled');
            expect(result).toContain('test-value');
        });

        it('should handle Sinon async stubs in browser context', async () => {
            const code = `
                import sinon from 'sinon';
                
                // Create async stubs
                const asyncStub = sinon.stub();
                asyncStub.resolves('async-result');
                
                const rejectStub = sinon.stub();
                rejectStub.rejects(new Error('async-error'));
                
                window.SINON_ASYNC_TEST = {
                    asyncStub,
                    rejectStub,
                    testAsync: async () => {
                        try {
                            const result = await asyncStub();
                            return { success: true, result };
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    }
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('SINON_ASYNC_TEST');
            expect(result).toContain('asyncStub');
            expect(result).toContain('rejectStub');
            expect(result).toContain('async-result');
            expect(result).toContain('async-error');
        });

        it('should handle Sinon sandbox creation and cleanup', async () => {
            const code = `
                import sinon from 'sinon';
                
                // Create sandbox
                const sandbox = sinon.createSandbox();
                
                // Create stubs using sandbox
                const stub1 = sandbox.stub();
                const stub2 = sandbox.stub();
                
                stub1.returns('sandbox-test-1');
                stub2.returns('sandbox-test-2');
                
                // Test sandbox functionality
                const result1 = stub1();
                const result2 = stub2();
                
                window.SINON_SANDBOX_TEST = {
                    sandboxAvailable: typeof sandbox !== 'undefined',
                    result1,
                    result2,
                    stub1Called: stub1.called,
                    stub2Called: stub2.called,
                    restoreFunction: typeof sandbox.restore === 'function'
                };
            `;
            
            const result = await compileJavascriptCode(code);
            
            expect(result).toContain('SINON_SANDBOX_TEST');
            expect(result).toContain('sandboxAvailable');
            expect(result).toContain('sandbox-test-1');
            expect(result).toContain('sandbox-test-2');
            expect(result).toContain('restoreFunction');
        });
    });
});