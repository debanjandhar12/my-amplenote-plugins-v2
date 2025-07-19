export const errorToString = (error) => {
    let baseMessage = null;
    if (typeof error === 'string') {
        baseMessage = error;
    }
    else if (error instanceof Error) {
        baseMessage = error.message;
    }
    else if (error !== null && error !== undefined) {
        try {
            baseMessage = String(error);
        } catch (e) {}
    }
    if (!baseMessage) baseMessage = JSON.stringify(error);

    // Make sure there is no Error: at start
    let processedMessage = (typeof baseMessage === 'string' ? baseMessage : '').trim();
    const prefixPattern = /^(Error\s*:\s*)+/i;
    processedMessage = processedMessage.replace(prefixPattern, '');
    processedMessage = processedMessage.trim();

    return processedMessage;
}
