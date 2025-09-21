import pluginObject from "../plugin.js";
import { allure } from 'jest-allure2-reporter/api';

describe('mindmap plugin object', () => {
    beforeEach(() => {
        allure.epic('src-mindmap');
    });

    it('should load successfully', async () => {
        expect(pluginObject).toBeDefined();
        expect(typeof pluginObject).toBe('object');
    });
});
