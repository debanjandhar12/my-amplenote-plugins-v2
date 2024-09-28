export const EMBED_COMMANDS_MOCK = {
    "navigate": async (url) => {
        window.location.href = url;
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

export const EMBED_NOTE_UUID_MOCK = 'mock-uuid';