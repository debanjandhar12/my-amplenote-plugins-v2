/**
 * Utility functions for detecting and processing tool category mentions in text.
 * 
 * Tool category mentions follow the pattern:
 * - Must be preceded by start of string, space, or newline
 * - Must be followed by space, newline, dot, or end of string
 * - Format: @categoryName
 */

/**
 * Creates a regex pattern for detecting tool category mentions
 * @param {string} categoryName - The category name to match
 * @returns {RegExp} Regex pattern for the category mention
 */
export function createCategoryMentionRegex(categoryName) {
    // Escape special regex characters in category name
    const escapedCategoryName = categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s|\\n|\\(|\\[)@${escapedCategoryName}(\\s|\\n|\!|\\?|\\)|\]|\\.|$)`, 'g');
}

/**
 * Tests if text contains any tool category mentions
 * @param {string} text - The text to test
 * @param {string[]} categoryNames - Array of category names to check for
 * @returns {boolean} True if any mentions are found
 */
export function hasToolCategoryMentions(text, categoryNames) {
    for (const categoryName of categoryNames) {
        const regex = createCategoryMentionRegex(categoryName);
        if (regex.test(text)) {
            return true;
        }
    }
    return false;
}

/**
 * Finds all tool category mentions in text
 * @param {string} text - The text to search
 * @param {string[]} categoryNames - Array of category names to check for
 * @returns {Array} Array of mention objects with details
 */
export function findToolCategoryMentions(text, categoryNames) {
    const mentions = [];
    
    for (const categoryName of categoryNames) {
        const regex = createCategoryMentionRegex(categoryName);
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            mentions.push({
                categoryName: categoryName,
                start: match.index,
                end: match.index + match[0].length,
                fullMatch: match[0],
                prefix: match[1], // The character before @categoryName
                suffix: match[2], // The character after @categoryName
                mentionStart: match.index + match[1].length, // Start of @categoryName
                mentionEnd: match.index + match[1].length + categoryName.length + 1 // End of @categoryName
            });
        }
    }
    
    // Sort by position for consistent processing
    return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Gets category names that are mentioned in the text
 * @param {string} text - The text to search
 * @param {string[]} categoryNames - Array of category names to check for
 * @returns {string[]} Array of mentioned category names
 */
export function getMentionedCategoryNames(text, categoryNames) {
    const mentionedCategories = new Set();
    
    for (const categoryName of categoryNames) {
        const regex = createCategoryMentionRegex(categoryName);
        if (regex.test(text)) {
            mentionedCategories.add(categoryName);
        }
    }
    
    return Array.from(mentionedCategories);
}

/**
 * Processes text and replaces tool category mentions with a replacement function
 * @param {string} text - The text to process
 * @param {string[]} categoryNames - Array of category names to check for
 * @param {Function} replacementFn - Function that takes (categoryName, mention) and returns replacement
 * @returns {Array} Array of text parts and replacements
 */
export function processToolCategoryMentions(text, categoryNames, replacementFn) {
    const mentions = findToolCategoryMentions(text, categoryNames);
    
    if (mentions.length === 0) {
        return [text];
    }
    
    const result = [];
    let lastIndex = 0;
    
    for (const mention of mentions) {
        // Add text before mention
        if (mention.start > lastIndex) {
            result.push(text.substring(lastIndex, mention.start));
        }
        
        // Add prefix (space, newline, or empty if at start)
        if (mention.prefix) {
            result.push(mention.prefix);
        }
        
        // Add the replacement for the mention
        const replacement = replacementFn(mention.categoryName, mention);
        result.push(replacement);
        
        // Add suffix (space, newline, dot, or empty if at end)
        if (mention.suffix) {
            result.push(mention.suffix);
        }
        
        lastIndex = mention.end;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
        result.push(text.substring(lastIndex));
    }
    
    return result;
}