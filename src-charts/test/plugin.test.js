import pluginObject from "../plugin.js";

describe('charts plugin', () => {
    it('should load successfully', async () => {
        expect(pluginObject).toBeDefined();
        expect(typeof pluginObject).toBe('object');
    });
});