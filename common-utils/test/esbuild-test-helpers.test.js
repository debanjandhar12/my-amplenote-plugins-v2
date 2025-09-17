import { jest } from '@jest/globals';

// Mock esbuild to avoid environment issues in Jest
jest.mock('esbuild', () => ({
    build: jest.fn()
}));

jest.mock('esbuild-plugins-node-modules-polyfill', () => ({
    nodeModulesPolyfillPlugin: jest.fn(() => ({ name: 'mock-polyfill-plugin' }))
}));

// Mock the embed-helpers module
jest.mock('../embed-helpers.js', () => ({
    addScriptToHtmlString: jest.fn((html, script) => `${html}<script>${script}</script>`)
}));

import { compileMockCode, addCompiledMocksToHtml } from '../esbuild-test-helpers.js';
import { addScriptToHtmlString } from '../embed-helpers.js';
import * as esbuild from 'esbuild';

describe('esbuild-test-helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('compileMockCode', () => {
        it('should compile basic JavaScript without imports', async () => {
            const code = `
                window.TEST_VALUE = 'hello world';
                console.log('Mock loaded');
            `;
            
            // Mock successful esbuild result
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.TEST_VALUE = 'hello world';
                        console.log('Mock loaded');
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('TEST_VALUE');
            expect(result).toContain('hello world');
            expect(result).toContain('Mock loaded');
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                stdin: expect.objectContaining({
                    contents: code,
                    loader: 'js'
                }),
                bundle: true,
                write: false,
                platform: 'browser',
                target: 'es2020',
                format: 'iife'
            }));
        });

        it('should compile JavaScript with import statements', async () => {
            const code = `
                import { jest } from '@jest/globals';
                
                window.MOCK_JEST = jest;
                window.TEST_IMPORT = 'imported successfully';
            `;
            
            // Mock successful esbuild result with bundled imports
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        var jest = require('@jest/globals').jest;
                        window.MOCK_JEST = jest;
                        window.TEST_IMPORT = 'imported successfully';
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('TEST_IMPORT');
            expect(result).toContain('imported successfully');
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
            
            // Mock esbuild preserving function structure
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.MOCK_FUNCTIONS = {
                            asyncFunction: async (param) => {
                                await new Promise(resolve => setTimeout(resolve, 100));
                                return 'async result: ' + param;
                            },
                            regularFunction: (a, b) => a + b,
                            arrowFunction: () => 'arrow result'
                        };
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('asyncFunction');
            expect(result).toContain('regularFunction');
            expect(result).toContain('arrowFunction');
            expect(result).toContain('async result');
            expect(result).toContain('arrow result');
        });

        it('should use IIFE format by default', async () => {
            const code = `window.TEST = 'iife test';`;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.TEST = 'iife test';
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            // IIFE format should wrap code in an immediately invoked function
            expect(result).toMatch(/^\(\(\) => \{[\s\S]*\}\)\(\);?$/);
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                format: 'iife'
            }));
        });

        it('should handle compilation options', async () => {
            const code = `
                window.TEST_TARGET = 'es2020 test';
                const modernFeature = { ...{a: 1}, b: 2 };
                window.MODERN_FEATURE = modernFeature;
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.TEST_TARGET = 'es2020 test';
                        const modernFeature = { ...{a: 1}, b: 2 };
                        window.MODERN_FEATURE = modernFeature;
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code, {
                target: 'es2020',
                minify: false
            });
            
            expect(result).toContain('TEST_TARGET');
            expect(result).toContain('MODERN_FEATURE');
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                target: 'es2020',
                minify: false
            }));
        });

        it('should handle define options for build-time constants', async () => {
            const code = `
                window.BUILD_CONSTANT = BUILD_TIME_VALUE;
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.BUILD_CONSTANT = "test_value";
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code, {
                define: {
                    'BUILD_TIME_VALUE': '"test_value"'
                }
            });
            
            expect(result).toContain('test_value');
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                define: expect.objectContaining({
                    'BUILD_TIME_VALUE': '"test_value"'
                })
            }));
        });

        it('should provide descriptive error messages for syntax errors', async () => {
            const invalidCode = `
                window.TEST = 'unclosed string;
                const invalid = {;
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [],
                errors: [{
                    text: 'Unterminated string literal',
                    location: {
                        line: 2,
                        column: 31,
                        file: 'stdin'
                    }
                }],
                warnings: []
            });
            
            await expect(compileMockCode(invalidCode)).rejects.toThrow(/Mock compilation failed[\s\S]*Unterminated string literal[\s\S]*line 2, column 31/);
        });

        it('should provide helpful error messages for import resolution failures', async () => {
            const codeWithBadImport = `
                import { nonExistentFunction } from './non-existent-file.js';
                window.TEST = nonExistentFunction();
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [],
                errors: [{
                    text: 'Could not resolve "./non-existent-file.js"',
                    location: {
                        line: 2,
                        column: 52
                    }
                }],
                warnings: []
            });
            
            await expect(compileMockCode(codeWithBadImport)).rejects.toThrow(/Mock compilation failed[\s\S]*Could not resolve[\s\S]*Make sure all import paths are correct/);
        });

        it('should handle external dependencies', async () => {
            const code = `
                import React from 'react';
                window.EXTERNAL_REACT = React;
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        var React = require('react');
                        window.EXTERNAL_REACT = React;
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code, {
                external: ['react']
            });
            
            // Should not bundle React, but should reference it
            expect(result).not.toContain('createElement');
            expect(result).toContain('EXTERNAL_REACT');
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                external: ['react']
            }));
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
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
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
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('asyncFn');
            expect(result).toContain('regularFn');
            expect(result).toContain('arrowFn');
            expect(result).toContain('Symbol(');
            expect(result).toContain('undefined');
            expect(result).toContain('nested value');
        });

        it('should handle multiple import statements and dependency resolution', async () => {
            const code = `
                import { jest } from '@jest/globals';
                import { EMBED_COMMANDS_MOCK } from '../test/testdata.js';
                import { LLM_MAX_TOKENS_SETTING } from '../constants.js';
                
                window.MULTIPLE_IMPORTS = {
                    jest,
                    embedCommands: EMBED_COMMANDS_MOCK,
                    maxTokensSetting: LLM_MAX_TOKENS_SETTING
                };
            `;
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        var jest = require('@jest/globals').jest;
                        var EMBED_COMMANDS_MOCK = require('../test/testdata.js').EMBED_COMMANDS_MOCK;
                        var LLM_MAX_TOKENS_SETTING = require('../constants.js').LLM_MAX_TOKENS_SETTING;
                        
                        window.MULTIPLE_IMPORTS = {
                            jest,
                            embedCommands: EMBED_COMMANDS_MOCK,
                            maxTokensSetting: LLM_MAX_TOKENS_SETTING
                        };
                    })();`
                }],
                errors: [],
                warnings: []
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('MULTIPLE_IMPORTS');
            expect(result).toContain('embedCommands');
            expect(result).toContain('maxTokensSetting');
        });

        it('should handle esbuild build errors gracefully', async () => {
            const code = 'window.TEST = "test";';
            
            // Mock esbuild throwing an error
            esbuild.build.mockRejectedValue(new Error('Build process failed'));
            
            await expect(compileMockCode(code)).rejects.toThrow(/Mock compilation failed: Build process failed/);
        });

        it('should handle warnings without failing', async () => {
            const code = 'window.TEST = "test";';
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: '(() => { window.TEST = "test"; })();'
                }],
                errors: [],
                warnings: [{
                    text: 'Unused import detected'
                }]
            });
            
            const result = await compileMockCode(code);
            
            expect(result).toContain('TEST');
            expect(consoleSpy).toHaveBeenCalledWith('Mock compilation warnings:', 'Unused import detected');
            
            consoleSpy.mockRestore();
        });

        it('should provide enhanced error messages for common issues', async () => {
            const code = 'window.TEST = "test";';
            
            // Test "Could not resolve" error enhancement
            esbuild.build.mockRejectedValue(new Error('Could not resolve "./missing-file.js"'));
            
            await expect(compileMockCode(code)).rejects.toThrow(/Make sure all import paths are correct and dependencies are available/);
            
            // Test "Unexpected" error enhancement
            esbuild.build.mockRejectedValue(new Error('Unexpected token'));
            
            await expect(compileMockCode(code)).rejects.toThrow(/Check for syntax errors in your mock code/);
        });

        it('should include process.env.NODE_ENV in define by default', async () => {
            const code = 'window.NODE_ENV = process.env.NODE_ENV;';
            
            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: '(() => { window.NODE_ENV = "test"; })();'
                }],
                errors: [],
                warnings: []
            });
            
            await compileMockCode(code);
            
            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                define: expect.objectContaining({
                    'process.env.NODE_ENV': expect.any(String)
                })
            }));
        });
    });

    describe('addCompiledMocksToHtml', () => {
        it('should compile mock code and inject it into HTML', async () => {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Chat Test</title>
                    </head>
                    <body>
                        <div id="root"></div>
                    </body>
                </html>
            `;

            const mockCode = `
                window.INJECTED_SETTINGS = {
                    provider: 'test',
                    maxTokens: 100
                };
                
                window.INJECTED_EMBED_COMMANDS_MOCK = {
                    getSettings: async () => window.INJECTED_SETTINGS,
                    createNote: async (name, tags) => {
                        return 'note-uuid-' + Math.random().toString(36).substring(2, 15);
                    }
                };
            `;

            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.INJECTED_SETTINGS = {
                            provider: 'test',
                            maxTokens: 100
                        };
                        
                        window.INJECTED_EMBED_COMMANDS_MOCK = {
                            getSettings: async () => window.INJECTED_SETTINGS,
                            createNote: async (name, tags) => {
                                return 'note-uuid-' + Math.random().toString(36).substring(2, 15);
                            }
                        };
                    })();`
                }],
                errors: [],
                warnings: []
            });

            const result = await addCompiledMocksToHtml(htmlContent, mockCode);

            expect(result).toContain('INJECTED_SETTINGS');
            expect(result).toContain('INJECTED_EMBED_COMMANDS_MOCK');
            expect(result).toContain('<div id="root"></div>');
            expect(result).toContain('<script>');
        });

        it('should pass compilation options through to compileMockCode', async () => {
            const htmlContent = '<html><body></body></html>';
            const mockCode = 'window.TEST = "test";';

            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: '(() => { window.TEST = "test"; })();'
                }],
                errors: [],
                warnings: []
            });

            const options = {
                target: 'es2018',
                minify: true
            };

            await addCompiledMocksToHtml(htmlContent, mockCode, options);

            expect(esbuild.build).toHaveBeenCalledWith(expect.objectContaining({
                target: 'es2018',
                minify: true
            }));
        });
    });

    describe('integration with existing patterns', () => {
        it('should work with addScriptToHtmlString for HTML injection', async () => {
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Chat Test</title>
                    </head>
                    <body>
                        <div id="root"></div>
                    </body>
                </html>
            `;

            const mockCode = `
                window.INJECTED_SETTINGS = {
                    provider: 'test',
                    maxTokens: 100
                };
                
                window.INJECTED_EMBED_COMMANDS_MOCK = {
                    getSettings: async () => window.INJECTED_SETTINGS,
                    createNote: async (name, tags) => {
                        return 'note-uuid-' + Math.random().toString(36).substring(2, 15);
                    }
                };
            `;

            esbuild.build.mockResolvedValue({
                outputFiles: [{
                    text: `(() => {
                        window.INJECTED_SETTINGS = {
                            provider: 'test',
                            maxTokens: 100
                        };
                        
                        window.INJECTED_EMBED_COMMANDS_MOCK = {
                            getSettings: async () => window.INJECTED_SETTINGS,
                            createNote: async (name, tags) => {
                                return 'note-uuid-' + Math.random().toString(36).substring(2, 15);
                            }
                        };
                    })();`
                }],
                errors: [],
                warnings: []
            });

            // Compile the mock code first, then use existing helper
            const compiledCode = await compileMockCode(mockCode);
            const result = addScriptToHtmlString(htmlContent, compiledCode);

            expect(result).toContain('INJECTED_SETTINGS');
            expect(result).toContain('INJECTED_EMBED_COMMANDS_MOCK');
            expect(result).toContain('<div id="root"></div>');
        });
    });
});