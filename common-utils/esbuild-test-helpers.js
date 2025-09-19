import { spawn } from 'child_process';

/**
 * Compiles JavaScript code with imports using esbuild in an external process.
 * This function is specifically designed to handle test mock code that needs to run
 * in browser environments, including proper bundling of Sinon mocking library.
 * 
 * The compilation process:
 * - Bundles all imports including Sinon for cross-environment compatibility
 * - Handles Node.js built-ins through polyfills or external declarations
 * - Unwraps IIFE format to make code directly executable in browser context
 * - Preserves function definitions and complex objects without serialization
 * 
 * @param {string} code - JavaScript code with import statements (e.g., `import sinon from 'sinon'`)
 * @returns {Promise<string>} Compiled JavaScript code ready for browser injection
 * 
 * @example
 * // Compile Sinon mock code for browser testing
 * const mockCode = `
 *   import sinon from 'sinon';
 *   const stub = sinon.stub().returns('test-value');
 *   window.mockFunction = stub;
 * `;
 * const compiled = await compileJavascriptCode(mockCode);
 * // Result can be injected into browser context via Playwright
 * 
 * @throws {Error} When compilation fails due to syntax errors or import resolution issues
 */
export async function compileJavascriptCode(code) {
    const target = 'es2020';
    const format = 'iife';
    const minify = false;
    const sourcemap = false;
    const external = [];
    const define = {};
    Object.keys(process.env).forEach(key => {
        define[`process.env.${key}`] = JSON.stringify(process.env[key]);
    });
    const enableNodeModulesPolyfill = true;

    return new Promise((resolve, reject) => {
        const config = {
            target,
            format,
            minify,
            sourcemap,
            external,
            enableNodeModulesPolyfill,
            define: {
                ...define
            }
        };

        // Create the compilation script that reads from stdin
        const compilerScript = `
            const path = require('path');
            
            // Add the project root to module paths so we can find esbuild and plugins
            const projectRoot = '${process.cwd()}';
            const Module = require('module');
            if (require.main && require.main.paths) {
                require.main.paths.unshift(path.join(projectRoot, 'node_modules'));
            } else {
                Module.globalPaths.unshift(path.join(projectRoot, 'node_modules'));
            }
            
            const esbuild = require('esbuild');
            
            // Try to load the nodeModulesPolyfillPlugin if available
            let nodeModulesPolyfillPlugin = null;
            try {
                const polyfillModule = require('esbuild-plugins-node-modules-polyfill');
                nodeModulesPolyfillPlugin = polyfillModule.nodeModulesPolyfillPlugin;
            } catch (e) {
                // Plugin not available, continue without it
            }

            const config = ${JSON.stringify(config)};

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
            }

            // Enhanced external list for Node.js built-ins
            const nodeBuiltins = [
                'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
                'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
                'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
                'v8', 'vm', 'zlib', 'constants', 'module', 'perf_hooks', 'process', 'sys',
                'async_hooks', 'http2', 'inspector', 'worker_threads', 'trace_events',
                // Additional Node.js built-ins that might be dynamically required
                'node:path', 'node:fs', 'node:util', 'node:crypto', 'node:os', 'node:stream',
                'node:events', 'node:buffer', 'node:process', 'node:url', 'node:querystring'
            ];
            
            const finalExternal = config.enableNodeModulesPolyfill 
                ? config.external 
                : [...new Set([...config.external, ...nodeBuiltins])];

            // Read input code from stdin
            let inputCode = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', (chunk) => {
                inputCode += chunk;
            });
            
            process.stdin.on('end', () => {
                esbuild.build({
                    stdin: {
                        contents: inputCode,
                        loader: 'js',
                        resolveDir: projectRoot
                    },
                    bundle: true,
                    write: false,
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
                }).then((result) => {
                    let compiledCode = result.outputFiles[0].text;
                    
                    // Post-process the result to unwrap IIFE and ensure global variable assignment
                    if (config.format === 'iife') {
                        // Trim whitespace for pattern matching
                        const trimmed = compiledCode.trim();
                        
                        // Check if it's an arrow function IIFE and unwrap it
                        if (trimmed.startsWith('(() => {') && trimmed.endsWith('})();')) {
                            // Remove the IIFE wrapper: (() => { ... })();
                            compiledCode = trimmed.slice(8, -5); // Remove '(() => {' from start and '})();' from end
                        } 
                        // Check if it's a function IIFE and unwrap it
                        else if (trimmed.startsWith('(function() {') && trimmed.endsWith('})();')) {
                            // Remove the function IIFE wrapper: (function() { ... })();
                            compiledCode = trimmed.slice(13, -5); // Remove '(function() {' from start and '})();' from end
                        }
                        // Check for function with space: (function () {
                        else if (trimmed.startsWith('(function () {') && trimmed.endsWith('})();')) {
                            // Remove the function IIFE wrapper: (function () { ... })();
                            compiledCode = trimmed.slice(14, -5); // Remove '(function () {' from start and '})();' from end
                        }
                    }
                    
                    console.log('COMPILATION_SUCCESS:' + compiledCode);
                }).catch(error => {
                    console.error('COMPILATION_ERROR:' + error.message);
                    process.exit(1);
                });
            });
        `;

        // Spawn the compilation process
        const child = spawn('node', ['-e', compilerScript], {
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
            if (code === 0) {
                // Extract the compiled result
                const successMatch = stdout.match(/COMPILATION_SUCCESS:(.*)$/s);
                if (successMatch) {
                    resolve(successMatch[1]);
                } else {
                    reject(new Error('Code compilation failed: No output received'));
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

                reject(new Error(`Code compilation failed: ${enhancedMessage}`));
            }
        });

        child.on('error', (error) => {
            reject(new Error(`Code compilation process failed: ${error.message}`));
        });

        // Send the code to the child process via stdin
        child.stdin.write(code);
        child.stdin.end();
    });
}



