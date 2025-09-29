/**
 * Utility class for IndexedDB operations with direct object storage.
 * Provides a simple key-value interface for storing and retrieving JavaScript objects.
 * Each file is stored as a separate IndexedDB database for better isolation.
 */
export class IndexedDBStorageUtils {
    static KEY_PREFIX = 'copilot_json_file_';
    static STORE_NAME = 'data';
    static DB_VERSION = 1;

    /**
     * Checks if IndexedDB is supported by the browser.
     * @returns {boolean} True if IndexedDB is supported, false otherwise.
     */
    static checkSupport() {
        try {
            return typeof indexedDB !== 'undefined' && indexedDB !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Gets the full database name with prefix
     * @param {string} key The key to prefix
     * @returns {string} The prefixed database name
     * @private
     */
    static _getPrefixedKey(key) {
        return `${IndexedDBStorageUtils.KEY_PREFIX}${key}`;
    }

    /**
     * Opens an IndexedDB database for the given key
     * @param {string} key The key to open database for
     * @param {boolean} readOnly Whether to open in read-only mode
     * @returns {Promise<IDBDatabase>} The opened database
     * @private
     */
    static async _openDatabase(key, readOnly = true) {
        return new Promise((resolve, reject) => {
            const dbName = IndexedDBStorageUtils._getPrefixedKey(key);
            const request = indexedDB.open(dbName, IndexedDBStorageUtils.DB_VERSION);

            request.onerror = () => {
                reject(new Error(`Failed to open IndexedDB database '${dbName}': ${request.error?.message || 'Unknown error'}`));
            };

            request.onsuccess = () => {
                const db = request.result;
                // Verify the object store exists
                if (!db.objectStoreNames.contains(IndexedDBStorageUtils.STORE_NAME)) {
                    db.close();
                    reject(new Error(`Object store '${IndexedDBStorageUtils.STORE_NAME}' not found in database '${dbName}'`));
                    return;
                }
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(IndexedDBStorageUtils.STORE_NAME)) {
                    db.createObjectStore(IndexedDBStorageUtils.STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Estimates the size of an object in bytes by converting it to JSON
     * This is used for size reporting since we can't directly measure IndexedDB object size
     * @param {any} obj The object to measure
     * @returns {number} Estimated size in bytes
     * @private
     */
    static _estimateObjectSize(obj) {
        try {
            return new Blob([JSON.stringify(obj)]).size;
        } catch (error) {
            // Fallback for non-serializable objects
            return 0;
        }
    }

    /**
     * Validates that data can be stored in IndexedDB
     * @param {any} data The data to validate
     * @throws {Error} If data cannot be stored in IndexedDB
     * @private
     */
    static _validateData(data) {
        // IndexedDB can store most JavaScript objects directly, but there are some limitations
        if (typeof data === 'function') {
            throw new Error('Cannot store functions in IndexedDB');
        }
        if (typeof data === 'symbol') {
            throw new Error('Cannot store symbols in IndexedDB');
        }
        // Note: IndexedDB handles circular references by throwing an error during storage
        // We'll let IndexedDB handle that validation during the actual store operation
    }

    /**
     * Reads an object directly from IndexedDB.
     * @param {string} key The key to read from
     * @returns {Promise<Object|null>} The stored object or null if not found
     * @throws {Error} If an error occurs during reading
     */
    static async readJsonFile(key) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to readJsonFile.");
        }

        if (!IndexedDBStorageUtils.checkSupport()) {
            console.warn("IndexedDB not supported, returning null for file read");
            return null;
        }

        try {
            // Check if database exists first to avoid creating it unnecessarily
            const dbName = IndexedDBStorageUtils._getPrefixedKey(key);

            // Try to check if database exists (not supported in all browsers)
            let dbExists = true; // Default to true if we can't check
            try {
                if (typeof indexedDB.databases === 'function') {
                    const databases = await indexedDB.databases();
                    dbExists = databases.some(db => db.name === dbName);
                }
            } catch (error) {
                // Fallback: assume database might exist and try to open it
                console.warn('Cannot check database existence, will attempt to open:', error);
                dbExists = true;
            }

            if (!dbExists) {
                return null;
            }

            let db;
            try {
                db = await IndexedDBStorageUtils._openDatabase(key, true);
            } catch (error) {
                // If database is corrupted (missing object store), delete and return null
                if (error.message.includes('Object store')) {
                    console.warn(`Corrupted database detected for key '${key}', deleting it`);
                    await IndexedDBStorageUtils.deleteFile(key);
                    return null;
                }
                throw error;
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([IndexedDBStorageUtils.STORE_NAME], 'readonly');
                const store = transaction.objectStore(IndexedDBStorageUtils.STORE_NAME);
                const request = store.get('data');

                request.onerror = () => {
                    db.close();
                    reject(new Error(`Error reading from IndexedDB: ${request.error?.message || 'Unknown error'}`));
                };

                request.onsuccess = () => {
                    db.close();
                    const result = request.result;
                    if (result && 'content' in result) {
                        // Return the object directly - no JSON parsing needed
                        resolve(result.content);
                    } else {
                        resolve(null);
                    }
                };
            });
        } catch (error) {
            console.error(`Error reading data from IndexedDB with key '${key}':`, error);
            throw error;
        }
    }

    /**
     * Writes an object directly to IndexedDB.
     * @param {string} key The key to store the data under
     * @param {any} data The object to store directly
     * @returns {Promise<boolean>} True if successful, false if IndexedDB not supported
     * @throws {Error} If an error occurs during writing or if data is not serializable
     */
    static async writeJsonFile(key, data) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to writeJsonFile.");
        }

        if (!IndexedDBStorageUtils.checkSupport()) {
            console.warn("IndexedDB not supported, cannot write file");
            return false;
        }

        try {
            // Validate that the data can be stored in IndexedDB
            IndexedDBStorageUtils._validateData(data);

            let db;

            try {
                db = await IndexedDBStorageUtils._openDatabase(key, false);
            } catch (error) {
                // If database is corrupted, delete it and try again
                if (error.message.includes('Object store')) {
                    console.warn(`Corrupted database detected for key '${key}', recreating it`);
                    await IndexedDBStorageUtils.deleteFile(key);
                    db = await IndexedDBStorageUtils._openDatabase(key, false);
                } else {
                    throw error;
                }
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([IndexedDBStorageUtils.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(IndexedDBStorageUtils.STORE_NAME);
                const request = store.put({
                    id: 'data',
                    content: data, // Store the object directly
                    timestamp: Date.now()
                });

                request.onerror = () => {
                    db.close();
                    const error = request.error;
                    if (error && error.name === 'QuotaExceededError') {
                        reject(new Error(`IndexedDB quota exceeded for key '${key}': ${error.message}`));
                    } else if (error && error.name === 'DataCloneError') {
                        reject(new Error(`Cannot store data in IndexedDB for key '${key}': ${error.message}. Data contains non-serializable values.`));
                    } else {
                        reject(new Error(`Error writing to IndexedDB: ${error?.message || 'Unknown error'}`));
                    }
                };

                request.onsuccess = () => {
                    db.close();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error(`Error writing data to IndexedDB with key '${key}':`, error);
            throw error;
        }
    }

    /**
     * Deletes a key from IndexedDB by deleting the entire database.
     * @param {string} key The key to delete
     * @returns {Promise<boolean>} True if deleted, false if key didn't exist
     * @throws {Error} If an error occurs during deletion
     */
    static async deleteFile(key) {
        if (!key || typeof key !== 'string') {
            throw new Error("Invalid key provided to deleteFile.");
        }

        if (!IndexedDBStorageUtils.checkSupport()) {
            console.warn("IndexedDB not supported, cannot delete file");
            return false;
        }

        try {
            const dbName = IndexedDBStorageUtils._getPrefixedKey(key);

            // Check if database exists first (if supported)
            let exists = true; // Default to true if we can't check
            try {
                if (typeof indexedDB.databases === 'function') {
                    const databases = await indexedDB.databases();
                    exists = databases.some(db => db.name === dbName);

                    if (!exists) {
                        return false;
                    }
                }
            } catch (error) {
                // Fallback: try to delete anyway, will fail gracefully if doesn't exist
                console.warn('Cannot check database existence for deletion:', error);
            }

            return new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(dbName);

                deleteRequest.onerror = () => {
                    reject(new Error(`Error deleting IndexedDB database '${dbName}': ${deleteRequest.error?.message || 'Unknown error'}`));
                };

                deleteRequest.onsuccess = () => {
                    resolve(true);
                };

                deleteRequest.onblocked = () => {
                    console.warn(`Delete blocked for database '${dbName}'. Retrying...`);
                    // The deletion will complete when other connections are closed
                };
            });
        } catch (error) {
            console.error(`Error deleting from IndexedDB with key '${key}':`, error);
            throw error;
        }
    }

    /**
     * Lists all IndexedDB databases that match our prefix.
     * @returns {Promise<Array<{fileName: string, fileSizeMB: number}>>} Array of file info objects
     * @throws {Error} If an error occurs during listing
     */
    static async getFileList() {
        if (!IndexedDBStorageUtils.checkSupport()) {
            return [];
        }

        try {
            let fileList = [];

            // Try to get database list if supported
            try {
                if (typeof indexedDB.databases === 'function') {
                    const databases = await indexedDB.databases();
                    const prefixLength = IndexedDBStorageUtils.KEY_PREFIX.length;

                    for (const dbInfo of databases) {
                        if (dbInfo.name && dbInfo.name.startsWith(IndexedDBStorageUtils.KEY_PREFIX)) {
                            const fileName = dbInfo.name.substring(prefixLength);

                            try {
                                // Estimate file size by reading the data and converting to JSON
                                const data = await IndexedDBStorageUtils.readJsonFile(fileName);
                                const fileSizeMB = data ? Math.round(IndexedDBStorageUtils._estimateObjectSize(data) / 1024 / 1024 * 100) / 100 : 0;

                                fileList.push({
                                    fileName,
                                    fileSizeMB
                                });
                            } catch (error) {
                                // If we can't read the file, still include it with 0 size
                                console.warn(`Could not read file '${fileName}' for size calculation:`, error);
                                fileList.push({
                                    fileName,
                                    fileSizeMB: 0
                                });
                            }
                        }
                    }
                } else {
                    console.warn('indexedDB.databases() not supported, returning empty file list');
                }
            } catch (error) {
                console.warn('Error getting database list:', error);
            }

            return fileList;
        } catch (error) {
            console.error("Error listing databases from IndexedDB:", error);
            throw error;
        }
    }

    /**
     * Gets storage usage information for IndexedDB
     * @returns {Promise<string>} Storage information message
     */
    static async getRemainingStorageSpace() {
        try {
            if (!IndexedDBStorageUtils.checkSupport()) {
                return 'IndexedDB not supported';
            }

            // Calculate used space by our databases
            let usedBytes = 0;
            const fileList = await IndexedDBStorageUtils.getFileList();

            for (const file of fileList) {
                usedBytes += file.fileSizeMB * 1024 * 1024;
            }

            const usedMB = Math.round(usedBytes / 1024 / 1024 * 100) / 100;

            // Try to get overall storage estimate if available
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const totalUsedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
                const remainingMB = quotaMB - totalUsedMB;
                return `Copilot Used: ${usedMB}MB, Total Used: ${totalUsedMB}MB, Quota: ${quotaMB}MB, Remaining: ${remainingMB}MB`;
            } else {
                return `Copilot Used: ${usedMB}MB (IndexedDB quota varies by browser and available disk space)`;
            }
        } catch (error) {
            console.error('Error getting storage space:', error);
            return 'Error getting storage space';
        }
    }
}