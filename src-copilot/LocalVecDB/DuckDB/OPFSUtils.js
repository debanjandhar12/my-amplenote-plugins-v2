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
}
