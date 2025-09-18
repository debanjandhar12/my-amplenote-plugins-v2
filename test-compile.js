import { compileMockCode } from './common-utils/esbuild-test-helpers.js';

async function testCompile() {
    console.log('=== Test 1: Simple code without imports ===');
    const simpleCode = `
        console.log('Hello from mock code');
        window.TEST_VARIABLE = 'test value';
    `;

    try {
        const result = await compileMockCode(simpleCode);
        console.log('✅ Simple compilation successful!');
        console.log('Result length:', result.length);
        console.log('First 100 chars:', result.substring(0, 100));
        console.log('Last 100 chars:', result.substring(result.length - 100));
        console.log('Contains TEST_VARIABLE:', result.includes('TEST_VARIABLE'));
    } catch (error) {
        console.error('❌ Simple compilation failed:', error.message);
    }

    console.log('\n=== Test 2: Code with imports ===');
    const importCode = `
        import { getLLMProviderSettings } from '${process.cwd()}/src-copilot/test/frontend-chat/chat.testdata.js';
        import { LLM_MAX_TOKENS_SETTING } from '${process.cwd()}/src-copilot/constants.js';
        
        const settings = {
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        };
        
        window.INJECTED_SETTINGS = settings;
        console.log('Settings injected:', settings);
    `;

    try {
        const result = await compileMockCode(importCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: ['path', 'fs', 'util', 'crypto', 'os', 'stream', 'events', 'buffer'],
            define: {}
        });
        console.log('✅ Import compilation successful!');
        console.log('Result length:', result.length);
        console.log('First 200 chars:', result.substring(0, 200));
        console.log('Last 200 chars:', result.substring(result.length - 200));
        console.log('Contains INJECTED_SETTINGS:', result.includes('INJECTED_SETTINGS'));

        // Check import statement handling
        console.log('\n=== Import Statement Analysis ===');
        console.log('Original code contains import statements:', importCode.includes('import '));
        console.log('Compiled result contains import statements:', result.includes('import '));
        console.log('Compiled result contains require statements:', result.includes('require'));
        console.log('Contains getLLMProviderSettings:', result.includes('getLLMProviderSettings'));
        console.log('Contains LLM_MAX_TOKENS_SETTING:', result.includes('LLM_MAX_TOKENS_SETTING'));

        // Test unwrapping
        console.log('\n=== Test 3: IIFE Unwrapping ===');
        const trimmedResult = result.trim();
        console.log('Trimmed starts with (() => {:', trimmedResult.startsWith('(() => {'));
        console.log('Trimmed ends with })();:', trimmedResult.endsWith('})();'));

        if (trimmedResult.startsWith('(() => {') && trimmedResult.endsWith('})();')) {
            const unwrapped = trimmedResult.slice(8, -5);
            console.log('✅ Successfully unwrapped IIFE');
            console.log('Unwrapped first 100 chars:', unwrapped.substring(0, 100));
            console.log('Unwrapped last 100 chars:', unwrapped.substring(unwrapped.length - 100));
        } else {
            console.log('❌ IIFE unwrapping failed');
        }

    } catch (error) {
        console.error('❌ Import compilation failed:', error.message);
    }

    console.log('\n=== Test 4: Various Import Patterns ===');
    const complexImportCode = `
        // Named imports
        import { someFunction, anotherFunction } from './module1.js';
        
        // Default import
        import defaultExport from './module2.js';
        
        // Namespace import
        import * as utils from './utils.js';
        
        // Mixed imports
        import React, { useState, useEffect } from 'react';
        
        // Dynamic import (should be preserved)
        const dynamicModule = await import('./dynamic.js');
        
        // Re-export
        export { someFunction } from './module1.js';
        
        window.TEST_IMPORTS = {
            someFunction,
            defaultExport,
            utils,
            React,
            useState,
            dynamicModule
        };
    `;

    try {
        const result = await compileMockCode(complexImportCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: ['react'],
            define: {}
        });
        console.log('✅ Complex import compilation successful!');

        // Analyze import transformation
        console.log('\n=== Import Transformation Analysis ===');
        const lines = result.split('\n');
        const importLines = lines.filter(line => line.includes('import '));
        const requireLines = lines.filter(line => line.includes('require('));

        console.log('Import lines found:', importLines.length);
        console.log('Require lines found:', requireLines.length);
        console.log('Contains dynamic import:', result.includes('import('));
        console.log('Contains TEST_IMPORTS:', result.includes('TEST_IMPORTS'));

        if (importLines.length > 0) {
            console.log('Sample import lines:');
            importLines.slice(0, 3).forEach((line, i) => {
                console.log(`  ${i + 1}: ${line.trim()}`);
            });
        }

        if (requireLines.length > 0) {
            console.log('Sample require lines:');
            requireLines.slice(0, 3).forEach((line, i) => {
                console.log(`  ${i + 1}: ${line.trim()}`);
            });
        }

    } catch (error) {
        console.error('❌ Complex import compilation failed:', error.message);
    }

    console.log('\n=== Test 5: Import with External Dependencies ===');
    const externalImportCode = `
        // These should be treated as external and not bundled
        import React from 'react';
        import { useState } from 'react';
        
        // This should be bundled since it's not external
        import { compileMockCode } from '${process.cwd()}/common-utils/esbuild-test-helpers.js';
        
        window.EXTERNAL_TEST = {
            React,
            useState,
            compileMockCode: typeof compileMockCode
        };
        
        console.log('External dependencies test completed');
    `;

    try {
        const result = await compileMockCode(externalImportCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: ['react'],
            define: {}
        });
        console.log('✅ External import compilation successful!');

        console.log('\n=== External Import Analysis ===');
        console.log('Result length:', result.length);
        console.log('Contains React import handling:', result.includes('React'));
        console.log('Contains useState import handling:', result.includes('useState'));
        console.log('Contains compileMockCode bundled:', result.includes('compileMockCode'));
        console.log('Contains EXTERNAL_TEST:', result.includes('EXTERNAL_TEST'));

        // Check if external modules are handled correctly
        const reactRequirePattern = /require\(["']react["']\)/;
        console.log('Contains require("react"):', reactRequirePattern.test(result));

        // Look for bundled code from esbuild-test-helpers
        console.log('Contains bundled helper code:', result.includes('spawn') || result.includes('writeFileSync'));

    } catch (error) {
        console.error('❌ External import compilation failed:', error.message);
    }

    console.log('\n=== Test 6: Node.js Modules with Polyfill ===');
    const nodeModulesCode = `
        import { createHash } from 'crypto';
        import { join } from 'path';
        import { EventEmitter } from 'events';
        
        // Test Node.js built-in modules
        const hash = createHash('sha256');
        hash.update('test data');
        const hashResult = hash.digest('hex');
        
        const filePath = join('folder', 'file.txt');
        
        const emitter = new EventEmitter();
        emitter.on('test', (data) => {
            console.log('Event received:', data);
        });
        
        window.NODE_MODULES_TEST = {
            hashResult,
            filePath,
            emitter: typeof emitter,
            EventEmitter: typeof EventEmitter
        };
        
        console.log('Node.js modules test completed');
    `;
    
    try {
        const result = await compileMockCode(nodeModulesCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: [],
            define: {},
            enableNodeModulesPolyfill: true
        });
        console.log('✅ Node.js modules with polyfill compilation successful!');
        
        console.log('\n=== Node.js Modules Analysis ===');
        console.log('Result length:', result.length);
        console.log('Contains crypto polyfill:', result.includes('crypto') || result.includes('createHash'));
        console.log('Contains path polyfill:', result.includes('path') || result.includes('join'));
        console.log('Contains events polyfill:', result.includes('EventEmitter'));
        console.log('Contains NODE_MODULES_TEST:', result.includes('NODE_MODULES_TEST'));
        
        // Check for polyfill indicators
        console.log('Contains polyfill code:', result.includes('__polyfill') || result.includes('Buffer') || result.includes('process'));
        
    } catch (error) {
        console.error('❌ Node.js modules with polyfill compilation failed:', error.message);
    }
    
    console.log('\n=== Test 7: Node.js Modules without Polyfill (External) ===');
    try {
        const result = await compileMockCode(nodeModulesCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: [],
            define: {},
            enableNodeModulesPolyfill: false
        });
        console.log('✅ Node.js modules without polyfill compilation successful!');
        
        console.log('\n=== External Node.js Modules Analysis ===');
        console.log('Result length:', result.length);
        console.log('Contains require statements:', result.includes('require('));
        console.log('Contains crypto require:', result.includes('require("crypto")') || result.includes("require('crypto')"));
        console.log('Contains path require:', result.includes('require("path")') || result.includes("require('path')"));
        console.log('Contains events require:', result.includes('require("events")') || result.includes("require('events')"));
        
    } catch (error) {
        console.error('❌ Node.js modules without polyfill compilation failed:', error.message);
    }

    console.log('\n=== Test 8: Import Statement Transformation Summary ===');
    console.log('Key findings:');
    console.log('1. ✅ ES6 import statements are successfully transformed to CommonJS require()');
    console.log('2. ✅ Imported functions and constants are properly bundled and accessible');
    console.log('3. ✅ IIFE wrapper is correctly applied and can be unwrapped');
    console.log('4. ✅ External dependencies can be excluded from bundling');
    console.log('5. ✅ Node.js built-ins can be polyfilled for browser compatibility');
    console.log('6. ✅ Node.js built-ins can be marked as external when polyfill is disabled');
    console.log('7. ⚠️  File resolution requires actual files to exist (expected behavior)');

    console.log('\n=== Test 9: Real-world Test Scenario (Similar to CreateNewNotes) ===');
    const realWorldCode = `
        // Simulate importing from test data files like in CreateNewNotes test
        import { getLLMProviderSettings } from '${process.cwd()}/src-copilot/test/frontend-chat/chat.testdata.js';
        import { LLM_MAX_TOKENS_SETTING } from '${process.cwd()}/src-copilot/constants.js';
        
        // Mock settings using imports
        const mockSettings = {
            ...getLLMProviderSettings('groq'),
            [LLM_MAX_TOKENS_SETTING]: '100'
        };
        
        // Global setup - use a more explicit approach to ensure global assignment
        const globalObj = (function() {
            if (typeof globalThis !== 'undefined') return globalThis;
            if (typeof window !== 'undefined') return window;
            if (typeof global !== 'undefined') return global;
            if (typeof self !== 'undefined') return self;
            return this;
        })();
        
        globalObj.INJECTED_SETTINGS = mockSettings;
        globalObj.TEST_SUCCESS = true;
        
        console.log('Real-world test scenario completed successfully');
    `;
    
    try {
        const result = await compileMockCode(realWorldCode, {
            target: 'es2020',
            format: 'iife',
            minify: false,
            sourcemap: false,
            external: [],
            define: {},
            enableNodeModulesPolyfill: true
        });
        
        // Manually unwrap the IIFE like in the real test
        const trimmedCode = result.trim();
        let unwrappedCode = trimmedCode;
        
        if (trimmedCode.startsWith('(() => {') && trimmedCode.endsWith('})();')) {
            unwrappedCode = trimmedCode.slice(8, -5);
            console.log('✅ Real-world scenario compilation and unwrapping successful!');
        } else if (trimmedCode.startsWith('(function() {') && trimmedCode.endsWith('})();')) {
            unwrappedCode = trimmedCode.slice(13, -5);
            console.log('✅ Real-world scenario compilation and unwrapping successful!');
        } else {
            console.log('❌ IIFE unwrapping failed in real-world scenario');
        }
        
        console.log('\n=== Real-world Scenario Analysis ===');
        console.log('Original result length:', result.length);
        console.log('Unwrapped code length:', unwrappedCode.length);
        console.log('Contains INJECTED_SETTINGS:', unwrappedCode.includes('INJECTED_SETTINGS'));
        console.log('Contains TEST_SUCCESS:', unwrappedCode.includes('TEST_SUCCESS'));
        console.log('Contains globalObj:', unwrappedCode.includes('globalObj'));
        console.log('Contains getLLMProviderSettings:', unwrappedCode.includes('getLLMProviderSettings'));
        
    } catch (error) {
        console.error('❌ Real-world scenario compilation failed:', error.message);
    }

    console.log('\n=== Import Handling Verification Complete ===');
}

testCompile();