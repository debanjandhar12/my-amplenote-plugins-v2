import pluginObject from "../plugin.js";

describe('mindmap plugin object', () => {
    it('should load successfully', async () => {
        expect(pluginObject).toBeDefined();
        expect(typeof pluginObject).toBe('object');
    });
});
