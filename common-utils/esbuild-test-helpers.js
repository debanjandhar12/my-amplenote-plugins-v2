import { addScriptToHtmlString } from './embed-helpers.js';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Compiles JavaScript code with imports using esbuild in an external process
 * @param {string} code - JavaScript code with import statements
 * @param {Object} options - Compilation options
 * @param {string} options.target - Target ES version (default: 'es2020')
 * @param {string} options.format - Output format (default: 'iife')
 * @param {boolean} options.minify - Whether to minify output (default: false)
 * @param {boolean} options.sourcemap - Whether to generate sourcemap (default: false)
 * @param {string[]} options.external - External dependencies to exclude
 * @param {Record<string, string>} options.define - Build-time constants
 * @param {boolean} options.enableNodeModulesPolyfill - Enable Node.js modules polyfill for browser (default: false)
 * @returns {Promise<string>} Compiled JavaScript code ready for browser injection
 */
export async function compileMockCode(code, options = {}) {
    const {
        target = 'es2020',
        format = 'iife',
        minify = false,
        sourcemap = false,
        external = [],
        define = {},
        enableNodeModulesPolyfill = false
    } = options;

    return new Promise((resolve, reject) => {
        // Create temporary directory and files
        const tempDir = mkdtempSync(join(tmpdir(), 'esbuild-compile-'));
        const inputFile = join(tempDir, 'input.js');
        const outputFile = join(tempDir, 'output.js');
        const configFile = join(tempDir, 'config.json');

        try {
            // Write the code to a temporary file
            writeFileSync(inputFile, code);

            // Write the configuration
            const config = {
                target,
                format,
                minify,
                sourcemap,
                external,
                enableNodeModulesPolyfill,
                define: {
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                    ...define
                }
            };
            writeFileSync(configFile, JSON.stringify(config));

            // Create the compilation script
            const compilerScript = `
                const path = require('path');
                const fs = require('fs');
                
                // Add the project root to module paths so we can find esbuild and plugins
                const projectRoot = '${process.cwd()}';
                require.main.paths.unshift(path.join(projectRoot, 'node_modules'));
                
                const esbuild = require('esbuild');
                
                // Try to load the nodeModulesPolyfillPlugin if available
                let nodeModulesPolyfillPlugin = null;
                try {
                    const polyfillModule = require('esbuild-plugins-node-modules-polyfill');
                    nodeModulesPolyfillPlugin = polyfillModule.nodeModulesPolyfillPlugin;
                } catch (e) {
                    console.error('NODE_MODULES_POLYFILL_DEBUG: Plugin not available:', e.message);
                }

                const inputFile = process.argv[2];
                const outputFile = process.argv[3];
                const configFile = process.argv[4];

                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

                // Build plugins array
                const plugins = [];
                if (nodeModulesPolyfillPlugin && config.enableNodeModulesPolyfill) {
                    plugins.push(nodeModulesPolyfillPlugin({
                        globals: { 
                            process: true,
                            Buffer: true,
                            global: true
                        }
                    }));
                    console.error('NODE_MODULES_POLYFILL_DEBUG: Added polyfill plugin');
                }

                // Enhanced external list for Node.js built-ins
                const nodeBuiltins = [
                    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
                    'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
                    'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
                    'v8', 'vm', 'zlib', 'constants', 'module', 'perf_hooks', 'process', 'sys',
                    'async_hooks', 'http2', 'inspector', 'worker_threads', 'trace_events'
                ];
                
                const finalExternal = config.enableNodeModulesPolyfill 
                    ? config.external 
                    : [...new Set([...config.external, ...nodeBuiltins])];

                esbuild.build({
                    entryPoints: [inputFile],
                    outfile: outputFile,
                    bundle: true,
                    platform: 'browser',
                    target: config.target,
                    format: 'iife', // Use IIFE but we'll unwrap it
                    minify: config.minify,
                    sourcemap: config.sourcemap,
                    external: finalExternal,
                    define: config.define,
                    legalComments: 'none',
                    treeShaking: true,
                    plugins: plugins
                }).then(() => {
                    let result = fs.readFileSync(outputFile, 'utf8');
                    
                    console.error('POST_PROCESS_DEBUG: Starting post-processing');
                    
                    // Post-process the result to unwrap IIFE and ensure global variable assignment
                    if (config.format === 'iife') {
                        const originalFirst = result.substring(0, 20);
                        const originalLast = result.substring(result.length - 20);
                        console.error('UNWRAP_DEBUG: Original first 20:', originalFirst);
                        console.error('UNWRAP_DEBUG: Original last 20:', originalLast);
                        
                        // Check if it's an IIFE and unwrap it
                        if (result.startsWith('(() => {') && result.endsWith('})();')) {
                            // Remove the IIFE wrapper: (() => { ... })();
                            result = result.slice(8, -5); // Remove '(() => {' from start and '})();' from end
                            console.error('UNWRAP_DEBUG: Unwrapped arrow IIFE');
                        } else if (result.startsWith('(function() {') && result.endsWith('})();')) {
                            // Remove the function IIFE wrapper: (function() { ... })();
                            result = result.slice(13, -5); // Remove '(function() {' from start and '})();' from end
                            console.error('UNWRAP_DEBUG: Unwrapped function IIFE');
                        } else {
                            console.error('UNWRAP_DEBUG: No IIFE pattern matched');
                        }
                        
                        const newFirst = result.substring(0, 20);
                        console.error('UNWRAP_DEBUG: New first 20:', newFirst);
                    }
                    
                    console.log('COMPILATION_SUCCESS:' + result);
                }).catch(error => {
                    console.error('COMPILATION_ERROR:' + error.message);
                    process.exit(1);
                });
            `;

            const compilerFile = join(tempDir, 'compiler.js');
            writeFileSync(compilerFile, compilerScript);

            // Spawn the compilation process
            const child = spawn('node', [compilerFile, inputFile, outputFile, configFile], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                // Cleanup temporary files
                try {
                    unlinkSync(inputFile);
                    unlinkSync(outputFile);
                    unlinkSync(configFile);
                    unlinkSync(compilerFile);
                } catch (e) {
                    // Ignore cleanup errors
                }

                if (code === 0) {
                    // Extract the compiled result
                    const successMatch = stdout.match(/COMPILATION_SUCCESS:(.*)$/s);
                    if (successMatch) {
                        resolve(successMatch[1]);
                    } else {
                        reject(new Error('Mock compilation failed: No output received'));
                    }
                } else {
                    // Extract error message
                    const errorMatch = stderr.match(/COMPILATION_ERROR:(.*)$/s);
                    const errorMessage = errorMatch ? errorMatch[1] : stderr || 'Unknown compilation error';
                    
                    let enhancedMessage = errorMessage;
                    
                    if (errorMessage.includes('Could not resolve')) {
                        enhancedMessage += '\n\nHint: Make sure all import paths are correct and dependencies are available.';
                    }
                    
                    if (errorMessage.includes('Unexpected')) {
                        enhancedMessage += '\n\nHint: Check for syntax errors in your mock code.';
                    }

                    reject(new Error(`Mock compilation failed: ${enhancedMessage}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Mock compilation process failed: ${error.message}`));
            });

        } catch (error) {
            reject(new Error(`Mock compilation setup failed: ${error.message}`));
        }
    });
}

/**
 * Convenience function that compiles mock code and adds it to HTML string
 * @param {string} htmlString - HTML content to inject compiled mock into
 * @param {string} mockCode - JavaScript code with import statements to compile
 * @param {Object} options - Compilation options (same as compileMockCode)
 * @returns {Promise<string>} HTML string with compiled mock code injected
 */
export async function addCompiledMocksToHtml(htmlString, mockCode, options = {}) {
    const compiledCode = await compileMockCode(mockCode, options);
    return addScriptToHtmlString(htmlString, compiledCode);
}

