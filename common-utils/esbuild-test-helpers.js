import { addScriptToHtmlString } from './embed-helpers.js';


/**
 * Compiles JavaScript code with imports using esbuild for browser execution
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

    try {
        const esbuild = require("esbuild");
        // Create a temporary entry point for the code
        const result = await esbuild.build({
            stdin: {
                contents: code,
                resolveDir: process.cwd(),
                loader: 'js'
            },
            bundle: true,
            write: false,
            platform: 'browser',
            target,
            format,
            minify,
            sourcemap,
            external,
            define: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                ...define
            },
            legalComments: 'none',
            treeShaking: true
        });

        if (result.errors.length > 0) {
            const errorMessages = result.errors.map(error => {
                let message = `Compilation Error: ${error.text}`;
                if (error.location) {
                    message += ` at line ${error.location.line}, column ${error.location.column}`;
                    if (error.location.file) {
                        message += ` in ${error.location.file}`;
                    }
                }
                return message;
            }).join('\n');
            
            throw new Error(`Mock compilation failed:\n${errorMessages}`);
        }

        if (result.warnings.length > 0) {
            console.warn('Mock compilation warnings:', result.warnings.map(w => w.text).join('\n'));
        }

        return result.outputFiles[0].text;
    } catch (error) {
        // Enhance error messages for common issues
        let enhancedMessage = error.message;
        
        if (error.message.includes('Could not resolve')) {
            enhancedMessage += '\n\nHint: Make sure all import paths are correct and dependencies are available.';
        }
        
        if (error.message.includes('Unexpected')) {
            enhancedMessage += '\n\nHint: Check for syntax errors in your mock code.';
        }

        throw new Error(`Mock compilation failed: ${enhancedMessage}`);
    }
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

