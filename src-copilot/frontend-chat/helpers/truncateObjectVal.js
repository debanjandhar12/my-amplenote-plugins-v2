/**
 * Intelligently truncates string values within an object to ensure its
 * JSON representation fits within a specified limit.
 * @param {object} input The object to truncate.
 * @param {number} limit The maximum size for the resulting JSON.
 * @param {string} truncationSuffix The string to indicate truncation.
 * @returns {object | string} The truncated object, or a truncated JSON string as a fallback.
 */
export function truncateObjectVal (input, limit, truncationSuffix) {
    let jsonInput = JSON.stringify(input);
    if (jsonInput.length <= limit) {
        return input;
    }

    const output = JSON.parse(jsonInput);
    const strings = [];

    // Recursively find all strings long enough to be truncated
    (function findStrings(obj, path) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path.concat(key);
            if (typeof value === 'string' && value.length > truncationSuffix.length) {
                strings.push({ path: currentPath, value });
            } else if (typeof value === 'object' && value !== null) {
                findStrings(value, currentPath);
            }
        }
    })(output, []);

    // Start with the longest strings first
    strings.sort((a, b) => b.value.length - a.value.length);
    let overage = jsonInput.length - limit;

    const setByPath = (obj, path, val) => {
        let node = obj;
        for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
        node[path[path.length - 1]] = val;
    };

    for (const str of strings) {
        if (overage <= 0) break;

        const originalLength = str.value.length;
        const reductionAmount = Math.min(overage, originalLength - truncationSuffix.length);
        if (reductionAmount <= 0) continue;

        const newLength = originalLength - reductionAmount;
        const truncatedValue = str.value.substring(0, newLength) + truncationSuffix;

        setByPath(output, str.path, truncatedValue);
        overage -= (originalLength - truncatedValue.length);
    }

    let finalJson = JSON.stringify(output);

    // As a final safety net, hard-truncate the JSON string if still too long
    if (finalJson.length > limit) {
        finalJson = finalJson.substring(0, limit - truncationSuffix.length) + truncationSuffix;
    }

    // Return a JSON object if possible, otherwise the truncated string
    try {
        return JSON.parse(finalJson);
    } catch {
        return finalJson;
    }
}