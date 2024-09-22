export const mockApp = {
    notes: {
        find: () => {
            return {
                name: 'Test note'
            }
        }
    },
    getNoteContent: () => {
        return `# Test Note

## Section 1
- item 1
- item 2
- item 3
        `
    },
    navigate: (url) => {
        window.open(url, '_blank')
    },
    saveFile: async (data, name) => {
        const blob = data instanceof Blob ? data : new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    },
    prompt: (message, options) => {
        return new Promise((resolve) => {
            const userInput = window.prompt(message, options.defaultValue || '');

            if (userInput === null) {
                resolve(null);
            } else {
                resolve(userInput);
            }
        });
    },
    setSetting: (key, value) => {
        return true;
    },
    settings: {
        
    }
}