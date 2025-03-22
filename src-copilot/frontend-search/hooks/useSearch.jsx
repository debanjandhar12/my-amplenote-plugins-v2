import {processLocalVecDBResults} from "./processLocalVecDBResults.js";
import {debounce} from "lodash-es";

// Custom hook for search functionality
export const useSearch = () => {
    // State management
    const [searchText, setSearchText] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncProgressText, setSyncProgressText] = React.useState('');
    const [syncError, setSyncError] = React.useState(null);
    const [searchOpts, setSearchOpts] = React.useState({
        isArchived: null, isSharedByMe: null, isSharedWithMe: null, isTaskListNote: null, isPublished: null
    });
    const [syncStatus, setSyncStatus] = React.useState('');

    // Fetch initial sync status
    const updateSyncStatus = async () => {
        try {
            const status = await window.appConnector.getLocalVecDBSyncState();
            setSyncStatus(status);
        } catch (e) {
            setSyncStatus('Error');
        }
    };
    React.useEffect(() => {
        updateSyncStatus();
    }, []);

    // Fetch search and sync messages on Init
    React.useEffect(() => {
        const fetchInitMessages = async () => {
            // Check for search text updates
            const searchTextMsg = await window.appConnector.receiveMessageFromPlugin('searchForTextInSearchInterface');
            if (searchTextMsg !== null) {
                setSearchText(searchTextMsg);
            }

            // Check for sync start command
            const startSync = await window.appConnector.receiveMessageFromPlugin('startSyncToLocalVecDBInSearchInterface');
            if (startSync === true) {
                handleSync();
            }
        }
        fetchInitMessages();
    }, []);

    // Search functionality
    const performSearch = async (query, searchOpts = {}) => {
        const results = await window.appConnector.searchNotesInLocalVecDB(query, searchOpts);
        return await processLocalVecDBResults(results);
    };

    // Debounced search handler
    const debouncedSearch = React.useMemo(
        () => debounce(async () => {
            setIsLoading(true);
            setError(null);

            try {
                let results;
                const isSpecialSearchText = searchText.match(/^<<Related:\s*([a-zA-Z0-9-]+)>>$/);
                if (isSpecialSearchText) {
                    const noteUUID = isSpecialSearchText[1];
                    const noteTitle = await window.appConnector.getNoteTitleByUUID(noteUUID);
                    const noteContent = await window.appConnector.getNoteContentByUUID(noteUUID);
                    const noteTags = await window.appConnector.getNoteTagsByUUID({uuid: noteUUID});
                    if (!noteContent && !noteTitle && !noteTags) {
                        throw new Error("Could not find note with UUID: " + noteUUID);
                    }
                    results = await performSearch('---\n'
                        + `title: ${noteTitle || 'Untitled Note'}\n`
                        + `tags: ${noteTags.join(', ')}\n`
                        + '---\n'
                        + noteContent, searchOpts);
                    // Filter out the current note from results
                    results = results.filter(result => result.noteUUID !== noteUUID);
                } else {
                    results = await performSearch(searchText, searchOpts);
                }
                setSearchResults(results);
            } catch (error) {
                console.error(error);
                setError((typeof error === 'string' ? error : error.message)
                    || 'An error occurred while searching');
            } finally {
                setIsLoading(false);
            }
        }, 320),
        [searchText, searchOpts]
    );

    const handleSearch = React.useCallback(() => {
        if (searchText.trim() === '') {
            setSearchResults([]);
            setError(null);
        } else {
            setIsLoading(true);
            debouncedSearch();
        }
    }, [debouncedSearch, searchText, searchOpts]);

    // Sync functionality
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncProgressText(null);
        while (await window.appConnector.receiveMessageFromPlugin('syncNotesProgress') != null) { // Clear any previous progress messages
        }
        const syncProgressListenerIntervalId = setInterval(async () => {
            let lastSyncProgressText = null;
            while (true) {
                let syncProgressText = await window.appConnector.receiveMessageFromPlugin('syncNotesProgress');
                if (syncProgressText === null) break;
                lastSyncProgressText = syncProgressText;
            }
            if (!lastSyncProgressText) return;
            setSyncProgressText(lastSyncProgressText);
        }, 1000);
        try {
            await window.appConnector.syncNotesWithLocalVecDB();
            window.appConnector.alert("Sync completed!");
            if (searchText.trim()) {
                await handleSearch();
            }
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError('Failed to sync notes: ' + (error.message || error));
        } finally {
            setIsSyncing(false);
            updateSyncStatus();
            clearInterval(syncProgressListenerIntervalId);
        }
    };

    // Effects
    React.useEffect(() => {
        handleSearch();
        return () => debouncedSearch.cancel();
    }, [searchText, handleSearch, searchOpts]);

    // Public interface
    return {
        searchText,
        setSearchText,
        searchResults,
        isLoading,
        error,
        isSyncing,
        syncError,
        syncProgressText,
        handleSync,
        searchOpts,
        setSearchOpts,
        syncStatus
    };
};