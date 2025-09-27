import {compileJavascriptCode} from "../compileJavascriptCode.js";
import {allure} from "jest-allure2-reporter/api";

describe('compileJavascriptCode', () => {
    beforeEach(() => {
        allure.epic('common-utils');
    });

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

    it('should compile JavaScript with node package import statements', async () => {
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

    it('should unwrap IIFE format automatically', async () => {
        const code = `window.TEST = 'iife test';`;

        const result = await compileJavascriptCode(code);

        // Should be unwrapped, not wrapped in IIFE
        expect(result).not.toMatch(/^\(\(\) => \{[\s\S]*\}\)\(\);?$/);
        expect(result).not.toMatch(/^\(function\(\) \{[\s\S]*\}\)\(\);?$/);

        // Should contain the actual code
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

        // Should be unwrapped, not wrapped in IIFE
        expect(result).not.toMatch(/^\(\(\) => \{/);
        expect(result).not.toMatch(/^\(function\(\) \{/);
        expect(result).not.toMatch(/\}\)\(\);?$/);

        // Should contain the actual code
        expect(result).toContain('COMPLEX_TEST');
        expect(result).toContain('arrow function');
        expect(result).toContain('IIFE unwrapping test');
    });

    it('should compile JavaScript with browser package import statements', async () => {
        const code = `
                import React from 'react';
                window.EXTERNAL_REACT = React;
            `;
        const result = await compileJavascriptCode(code);
        expect(result).toContain('Component');
    });
});