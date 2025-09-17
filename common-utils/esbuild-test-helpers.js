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
 * @returns {Promise<string>} Compiled JavaScript code ready for browser injection
 */
export async function compileMockCode(code, options = {}) {
    const {
        target = 'es2020',
        format = 'iife',
        minify = false,
        sourcemap = false,
        external = [],
        define = {}
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
                
                // Add the project root to module paths so we can find esbuild
                const projectRoot = '${process.cwd()}';
                require.main.paths.unshift(path.join(projectRoot, 'node_modules'));
                
                const esbuild = require('esbuild');

                const inputFile = process.argv[2];
                const outputFile = process.argv[3];
                const configFile = process.argv[4];

                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

                esbuild.build({
                    entryPoints: [inputFile],
                    outfile: outputFile,
                    bundle: true,
                    platform: 'browser',
                    target: config.target,
                    format: config.format,
                    minify: config.minify,
                    sourcemap: config.sourcemap,
                    external: config.external,
                    define: config.define,
                    legalComments: 'none',
                    treeShaking: true
                }).then(() => {
                    let result = fs.readFileSync(outputFile, 'utf8');
                    
                    // Post-process the result to ensure global variable assignment
                    // If it's an IIFE, we need to modify it to expose variables globally
                    if (config.format === 'iife' || !config.format) {
                        // Wrap the IIFE to capture and expose global assignments
                        result = result.replace(
                            /^\(\(\) => \{([\s\S]*)\}\)\(\);?$/,
                            '(function() { $1 })();'
                        );
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

