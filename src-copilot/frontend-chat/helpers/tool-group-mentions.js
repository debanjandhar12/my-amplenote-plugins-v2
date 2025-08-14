/**
 * Utility functions for detecting and processing tool group mentions in text.
 * 
 * Tool group mentions follow the pattern:
 * - Must be preceded by start of string, space, or newline
 * - Must be followed by space, newline, dot, or end of string
 * - Format: @groupName
 */

/**
 * Creates a regex pattern for detecting tool group mentions
 * @param {string} groupName - The group name to match
 * @returns {RegExp} Regex pattern for the group mention
 */
export function createGroupMentionRegex(groupName) {
    // Escape special regex characters in group name
    const escapedGroupName = groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s|\\n|\\(|\\[)@${escapedGroupName}(\\s|\\n|\!|\\?|\\)|\]|\\.|$)`, 'g');
}
/*
*
 * Tests if text contains any tool group mentions
 * @param {string} text - The text to test
 * @param {string[]} groupNames - Array of group names to check for
 * @returns {boolean} True if any mentions are found
 */
export function hasToolGroupMentions(text, groupNames) {
    for (const groupName of groupNames) {
        const regex = createGroupMentionRegex(groupName);
        if (regex.test(text)) {
            return true;
        }
    }
    return false;
}

/**
 * Finds all tool group mentions in text
 * @param {string} text - The text to search
 * @param {string[]} groupNames - Array of group names to check for
 * @returns {Array} Array of mention objects with details
 */
export function findToolGroupMentions(text, groupNames) {
    const mentions = [];
    
    for (const groupName of groupNames) {
        const regex = createGroupMentionRegex(groupName);
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            mentions.push({
                groupName: groupName,
                start: match.index,
                end: match.index + match[0].length,
                fullMatch: match[0],
                prefix: match[1], // The character before @groupName
                suffix: match[2], // The character after @groupName
                mentionStart: match.index + match[1].length, // Start of @groupName
                mentionEnd: match.index + match[1].length + groupName.length + 1 // End of @groupName
            });
        }
    }
    
    // Sort by position for consistent processing
    return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Gets group names that are mentioned in the text
 * @param {string} text - The text to search
 * @param {string[]} groupNames - Array of group names to check for
 * @returns {string[]} Array of mentioned group names
 */
export function getMentionedGroupNames(text, groupNames) {
    const mentionedGroups = new Set();
    
    for (const groupName of groupNames) {
        const regex = createGroupMentionRegex(groupName);
        if (regex.test(text)) {
            mentionedGroups.add(groupName);
        }
    }
    
    return Array.from(mentionedGroups);
}

/**
 * Processes text and replaces tool group mentions with a replacement function
 * @param {string} text - The text to process
 * @param {string[]} groupNames - Array of group names to check for
 * @param {Function} replacementFn - Function that takes (groupName, mention) and returns replacement
 * @returns {Array} Array of text parts and replacements
 */
export function processToolGroupMentions(text, groupNames, replacementFn) {
    const mentions = findToolGroupMentions(text, groupNames);
    
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
        const replacement = replacementFn(mention.groupName, mention);
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