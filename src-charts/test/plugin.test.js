import pluginObject from "../plugin.js";
import { allure } from 'jest-allure2-reporter/api';

describe('charts plugin', () => {
    beforeEach(() => {
        allure.epic('src-charts');
    });

    it('should load successfully', async () => {
        expect(pluginObject).toBeDefined();
        expect(typeof pluginObject).toBe('object');
    });
});