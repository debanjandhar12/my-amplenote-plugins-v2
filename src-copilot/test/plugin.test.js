import pluginObject from "../plugin.js";
import { allure } from 'jest-allure2-reporter/api';

describe('copilot plugin', () => {
    beforeEach(() => {
        allure.epic('src-copilot');
    });

    it('should load successfully', async () => {
        expect(pluginObject).toBeDefined();
        expect(typeof pluginObject).toBe('object');
    });
});