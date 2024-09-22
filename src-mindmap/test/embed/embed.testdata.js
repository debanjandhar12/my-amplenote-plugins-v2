export const callAmplenotePluginCommandMock = {
    "navigate": async (url) => {
        name: 'Test note'
    },
    "getSettings": async () => {
        return {};
    },
    "setSetting": async (key, value) => {
        return value;
    },
    "getNoteTitleByUUID": async (noteUUID) =>  {
        return "Test Note"
    },
    "getNoteContentByUUID": async (noteUUID) => {
        return "# Section 1\n- apple\n- **b**anana "
    },
    "prompt": async (message, options) => {
        return new Promise((resolve) => {
            const userInput = window.prompt(message, options.defaultValue || '');

            if (userInput === null) {
                resolve(null);
            } else {
                resolve(userInput);
            }
        });
    }
}