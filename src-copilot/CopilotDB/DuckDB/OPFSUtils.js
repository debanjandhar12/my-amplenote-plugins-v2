export class OPFSUtils {
    /**
     * Checks if the Origin Private File System (OPFS) is supported by the browser.
     * @returns {boolean} True if OPFS is supported, false otherwise.
     */
    static async checkSupport() {
        if (!navigator.storage || !navigator.storage.getDirectory) {
            return false;
        }
        try {
            await navigator.storage.getDirectory();
        } catch (error) {
            return false;
        }
        return true;
    }

    static async askStoragePermission() {
        try {
            return await navigator.storage.persist();
        } catch (error) {
            return false;
        }
    }

    /**
     * Checks if the Origin Private File System (OPFS) is persisted.
     * @returns {boolean} True if OPFS is persisted, false otherwise.
     */
    static async isPersisted() {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
            return true;
        }
        return false;
    }

    /**
     * Returns the root directory handle of the Origin Private File System.
     *
     * @returns {Promise<FileSystemDirectoryHandle>} A promise that resolves
     *          with the root directory handle.
     * @throws {Error} If unable to access the OPFS root (e.g., browser not supported).
     */
    static async getRoot() {
        if (!navigator.storage || !navigator.storage.getDirectory) {
            const error = new Error("OPFS API not supported in this environment.");
            console.error(error);
            throw error;
        }

        try {
            const root = await navigator.storage.getDirectory();
            return root;
        } catch (error) {
            console.error("Error getting OPFS root directory:", error);
            throw error;
        }
    }

    /**
     * Checks if a file with the given name exists at the root of the OPFS.
     * Does not check for files in subdirectories.
     *
     * @param {string} fileName The name of the file to check for.
     * @returns {Promise<boolean>} A promise that resolves to true if the file exists,
     *          false otherwise.
     * @throws {Error} If an error occurs other than the file not being found
     *          (e.g., permission issues, API failure).
     */
    static async doesFileExists(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            console.warn("Invalid fileName provided to doesFileExists.");
            return false; // Or throw an error depending on desired strictness
        }

        try {
            const root = await OPFSUtils.getRoot();
            await root.getFileHandle(fileName, { create: false });
            return true;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                return false;
            } else {
                console.error(`Error checking existence of file '${fileName}':`, error);
                throw error;
            }
        }
    }

    /**
     * Lists all files present directly at the root of the OPFS.
     * Does not list files in subdirectories.
     *
     * @returns {Promise<Array<{fileName: string, fileSizeMB: number}>>} A promise that resolves
     *          with an array of objects, each containing the file's name and size in megabytes.
     *          Returns an empty array if the root is empty or no files are present.
     * @throws {Error} If unable to list files from the OPFS root.
     */
    static async getFileList() {
        const fileList = [];

        try {
            const root = await OPFSUtils.getRoot();

            for await (const entry of root.entries()) {
                const [name, handle] = entry;

                if (handle.kind === 'file') {
                    try {
                        const file = await handle.getFile();

                        fileList.push({
                            fileName: name,
                            fileSizeMB: Math.round(file.size / 1024 / 1024)
                        });
                    } catch (fileError) {
                        console.warn(`Could not get details for file '${name}':`, fileError);
                    }
                }
            }
            return fileList;
        } catch (error) {
            console.error("Error listing files from OPFS root:", error);
            throw error;
        }
    }

    /**
     * Gets the estimated remaining storage space available
     * @returns {Promise<string>} Storage space information
     */
    static async getRemainingStorageSpace() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
                const remainingMB = quotaMB - usedMB;
                return `Used: ${usedMB}MB, Quota: ${quotaMB}MB, Remaining: ${remainingMB}MB`;
            } else {
                return 'Storage estimate not available';
            }
        } catch (error) {
            console.error('Error getting storage space:', error);
            return 'Error getting storage space';
        }
    }

    /**
     * Deletes a file from the OPFS root directory.
     *
     * @param {string} fileName The name of the file to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the file was deleted,
     *          false if the file didn't exist.
     * @throws {Error} If an error occurs during deletion (other than file not found).
     */
    static async deleteFile(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error("Invalid fileName provided to deleteFile.");
        }

        try {
            const root = await OPFSUtils.getRoot();
            await root.removeEntry(fileName);
            return true;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                return false;
            } else {
                console.error(`Error deleting file '${fileName}':`, error);
                throw error;
            }
        }
    }

    /**
     * Reads and parses a JSON file from OPFS root directory.
     *
     * @param {string} fileName The name of the JSON file to read.
     * @returns {Promise<Object|null>} A promise that resolves to the parsed JSON object,
     *          or null if the file doesn't exist or OPFS is not supported.
     * @throws {Error} If an error occurs during reading or parsing (other than file not found).
     */
    static async readJsonFile(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error("Invalid fileName provided to readJsonFile.");
        }

        try {
            // Check if OPFS is supported
            if (!await OPFSUtils.checkSupport()) {
                console.warn("OPFS not supported, returning null for JSON file read");
                return null;
            }

            const root = await OPFSUtils.getRoot();
            const fileHandle = await root.getFileHandle(fileName, { create: false });
            const file = await fileHandle.getFile();
            const text = await file.text();

            return JSON.parse(text);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                return null;
            } else if (error instanceof SyntaxError) {
                console.error(`Error parsing JSON file '${fileName}':`, error);
                throw new Error(`Invalid JSON in file '${fileName}': ${error.message}`);
            } else {
                console.error(`Error reading JSON file '${fileName}':`, error);
                throw error;
            }
        }
    }

    /**
     * Writes a JSON object to a file in OPFS root directory.
     *
     * @param {string} fileName The name of the JSON file to write.
     * @param {Object} data The object to serialize and write to the file.
     * @returns {Promise<boolean>} A promise that resolves to true if successful,
     *          false if OPFS is not supported.
     * @throws {Error} If an error occurs during writing or serialization.
     */
    static async writeJsonFile(fileName, data) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error("Invalid fileName provided to writeJsonFile.");
        }

        try {
            // Check if OPFS is supported
            if (!await OPFSUtils.checkSupport()) {
                console.warn("OPFS not supported, cannot write JSON file");
                return false;
            }

            const root = await OPFSUtils.getRoot();
            const fileHandle = await root.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            try {
                const jsonString = JSON.stringify(data, null, 2);
                await writable.write(jsonString);
            } finally {
                await writable.close();
            }
            return true;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('JSON')) {
                console.error(`Error serializing data for JSON file '${fileName}':`, error);
                throw new Error(`Cannot serialize data to JSON for file '${fileName}': ${error.message}`);
            } else {
                console.error(`Error writing JSON file '${fileName}':`, error);
                throw error;
            }
        }
    }

    /**
     * Updates a JSON file by merging new data with existing data.
     * If the file doesn't exist, it will be created with the new data.
     *
     * @param {string} fileName The name of the JSON file to update.
     * @param {Object} newData The object to merge with existing data.
     * @returns {Promise<boolean>} A promise that resolves to true if successful,
     *          false if OPFS is not supported.
     * @throws {Error} If an error occurs during the update process.
     */
    static async updateJsonFile(fileName, newData) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error("Invalid fileName provided to updateJsonFile.");
        }

        try {
            // Check if OPFS is supported
            if (!await OPFSUtils.checkSupport()) {
                console.warn("OPFS not supported, cannot update JSON file");
                return false;
            }

            const existingData = await OPFSUtils.readJsonFile(fileName) || {};
            const mergedData = { ...existingData, ...newData };

            return await OPFSUtils.writeJsonFile(fileName, mergedData);
        } catch (error) {
            console.error(`Error updating JSON file '${fileName}':`, error);
            throw error;
        }
    }
}
