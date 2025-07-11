import { Buffer } from 'buffer';

/**
 * Sanitizes text to prevent surrogate pair errors.
 * Uses Buffer to clean up any malformed UTF-16 surrogate pairs while preserving valid ones.
 *
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text safe for database operations
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // Convert to UTF-8 buffer and back to string to clean up surrogate pairs
    const buffer = Buffer.from(text, 'utf8');
    const sanitized = buffer.toString('utf8');

    return sanitized;
}
