/**
 * Utility class for LocalStorage operations with JSON data storage.
 * Provides a simple key-value interface for storing and retrieving JSON objects.
 * This is a fallback solution for browsers that don't support OPFS.
 */
export class LocalStorageUtils {
    static KEY_PREFIX = 'copilot_';

    /**
     * Checks if LocalStorage is supported by the browser.
     * @returns {boolean} True if LocalStorage is supported, false otherwise.
     */
    static checkSupport() {
        try {
            if (typeof Storage === 'undefined' || !window.localStorage) {
                return false;
            }
            // Test if we can actually use localStorage
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Gets the full key with prefix for localStorage
     * @param {string} key The key to prefix
     * @returns {string} The prefixed key
     * @private
     */
    static _getPrefixedKey(key) {
        return `${LocalStorageUtils.KEY_PREFIX}${key}`;
    }

    /**
     * Reads and parses a JSON object from LocalStorage.
     * @param {string} key The key to read from
     * @returns {Promise<Object|null>} The parsed JSON object or null if not found
     * @throws {Error} If an error occurs during reading or parsing
     */
    static async readJsonFile(key) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to readJsonFile.");
        }

        if (!LocalStorageUtils.checkSupport()) {
            console.warn("LocalStorage not supported, returning null for JSON file read");
            return null;
        }

        try {
            const prefixedKey = LocalStorageUtils._getPrefixedKey(key);
            const data = localStorage.getItem(prefixedKey);
            
            if (data === null) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error(`Error parsing JSON from LocalStorage with key '${key}':`, error);
                throw new Error(`Invalid JSON in LocalStorage for key '${key}': ${error.message}`);
            } else {
                console.error(`Error reading JSON from LocalStorage with key '${key}':`, error);
                throw error;
            }
        }
    }

    /**
     * Writes a JSON object to LocalStorage.
     * @param {string} key The key to store the data under
     * @param {Object} data The object to serialize and store
     * @returns {Promise<boolean>} True if successful, false if LocalStorage not supported
     * @throws {Error} If an error occurs during writing or serialization
     */
    static async writeJsonFile(key, data) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to writeJsonFile.");
        }

        if (!LocalStorageUtils.checkSupport()) {
            console.warn("LocalStorage not supported, cannot write JSON file");
            return false;
        }

        try {
            const prefixedKey = LocalStorageUtils._getPrefixedKey(key);
            const jsonString = JSON.stringify(data);
            localStorage.setItem(prefixedKey, jsonString);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error(`LocalStorage quota exceeded when writing key '${key}':`, error);
                throw new Error(`LocalStorage quota exceeded for key '${key}': ${error.message}`);
            } else if (error instanceof TypeError && error.message.includes('JSON')) {
                console.error(`Error serializing data for LocalStorage key '${key}':`, error);
                throw new Error(`Cannot serialize data to JSON for key '${key}': ${error.message}`);
            } else {
                console.error(`Error writing JSON to LocalStorage with key '${key}':`, error);
                throw error;
            }
        }
    }



    /**
     * Deletes a key from LocalStorage.
     * @param {string} key The key to delete
     * @returns {Promise<boolean>} True if deleted, false if key didn't exist
     * @throws {Error} If an error occurs during deletion
     */
    static async deleteFile(key) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to deleteFile.");
        }

        if (!LocalStorageUtils.checkSupport()) {
            console.warn("LocalStorage not supported, cannot delete file");
            return false;
        }

        try {
            const prefixedKey = LocalStorageUtils._getPrefixedKey(key);
            const existed = localStorage.getItem(prefixedKey) !== null;
            localStorage.removeItem(prefixedKey);
            return existed;
        } catch (error) {
            console.error(`Error deleting from LocalStorage with key '${key}':`, error);
            throw error;
        }
    }



    /**
     * Lists all keys in LocalStorage that match our prefix.
     * @returns {Promise<Array<{fileName: string, fileSizeMB: number}>>} Array of file info objects
     * @throws {Error} If an error occurs during listing
     */
    static async getFileList() {
        if (!LocalStorageUtils.checkSupport()) {
            return [];
        }

        try {
            const fileList = [];
            const prefixLength = LocalStorageUtils.KEY_PREFIX.length;

            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(LocalStorageUtils.KEY_PREFIX)) {
                    const fileName = fullKey.substring(prefixLength);
                    const data = localStorage.getItem(fullKey);
                    const fileSizeMB = data ? Math.round(new Blob([data]).size / 1024 / 1024) : 0;

                    fileList.push({
                        fileName,
                        fileSizeMB
                    });
                }
            }

            return fileList;
        } catch (error) {
            console.error("Error listing keys from LocalStorage:", error);
            throw error;
        }
    }

    /**
     * Gets storage usage information for LocalStorage
     * @returns {Promise<string>} Storage information message
     */
    static async getRemainingStorageSpace() {
        try {
            if (!LocalStorageUtils.checkSupport()) {
                return 'LocalStorage not supported';
            }

            // Calculate used space by our keys
            let usedBytes = 0;
            const prefixLength = LocalStorageUtils.KEY_PREFIX.length;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(LocalStorageUtils.KEY_PREFIX)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        usedBytes += new Blob([key + data]).size;
                    }
                }
            }

            const usedMB = Math.round(usedBytes / 1024 / 1024);

            // Try to get overall storage estimate if available
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const totalUsedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
                const remainingMB = quotaMB - totalUsedMB;
                return `Copilot Used: ${usedMB}MB, Total Used: ${totalUsedMB}MB, Quota: ${quotaMB}MB, Remaining: ${remainingMB}MB`;
            } else {
                return `Copilot Used: ${usedMB}MB (LocalStorage quota varies by browser, typically 5-10MB)`;
            }
        } catch (error) {
            console.error('Error getting storage space:', error);
            return 'Error getting storage space';
        }
    }


}