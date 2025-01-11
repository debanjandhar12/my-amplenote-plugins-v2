import {debounce, truncate} from "lodash-es";
import {processLocalVecDBResults} from "./tools-core/utils/processLocalVecDBResults.js";

// Custom hook for search functionality
const useSearch = () => {
    // State management
    const [searchText, setSearchText] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncProgressText, setSyncProgressText] = React.useState('');
    const [syncError, setSyncError] = React.useState(null);
    const [searchOpts, setSearchOpts] = React.useState({
        isArchived: null, isSharedByMe: null, isSharedWithMe: null, isTaskListNote: null, isPublished: null});
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

    // Search functionality
    const performSearch = async (query, searchOpts = {}) => {
        const results = await window.appConnector.searchInLocalVecDB(query, searchOpts);
        return await processLocalVecDBResults(results);
    };

    // Debounced search handler
    const debouncedSearch = React.useMemo(
        () => debounce(async () => {
            if (!searchText.trim()) {
                setSearchResults([]);
                setError(null);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const results = await performSearch(searchText, searchOpts);
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
        debouncedSearch();
    }, [debouncedSearch, searchText, searchOpts]);

    // Sync functionality
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncProgressText(null);
        while(await window.appConnector.receiveMessageFromPlugin('syncNotesProgress') != null) {} // Clear any previous progress messages
        const syncProgressListenerIntervalId = setInterval(async () => {
            const syncProgressText = await window.appConnector.receiveMessageFromPlugin('syncNotesProgress');
            if (!syncProgressText) return;
            setSyncProgressText(syncProgressText);
        }, 1000);
        try {
            await window.appConnector.syncNotesWithLocalVecDB();
            if (searchText.trim()) {
                await handleSearch();
            }
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError(error.message || 'Failed to sync notes');
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

// SearchStatus component to handle different states
const SearchStatus = ({ isLoading, error, isSyncing, syncError, syncProgressText, searchText, searchResults }) => {
    const {Flex, Box, Spinner, Text} = window.RadixUI;

    if (isSyncing) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '6px' }}>
                Syncing notes with LocalVecDB...
                {
                    syncProgressText &&
                    <Box style={{ marginTop: '4px', backgroundColor: '#0369a1', color: 'white', borderRadius: '4px', padding: '10px' }}>
                        <Text size="1">{syncProgressText}</Text>
                    </Box>
                }
            </Box>
        );
    }

    if (syncError) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center', color: '#e11d48', backgroundColor: '#ffe4e6', borderRadius: '6px' }}>
                {syncError}
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center' }}>
                <Flex direction={'column'} align={'center'} justify={'center'}>
                    <Spinner size="3" />
                    <Text color="gray" size="2">Searching</Text>
                </Flex>
            </Box>
        );
    }

    if (error) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center', color: '#e11d48', backgroundColor: '#ffe4e6', borderRadius: '6px' }}>
                {error}
            </Box>
        );
    }

    if (searchResults.length === 0) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                {searchText.trim() ? 'No results found' : 'Start typing to search your notes'}
            </Box>
        );
    }

    return null;
};

const FilterRow = ({ label, isEnabled, value, onChange }) => {
    const { Switch, IconButton, Flex } = window.RadixUI;
    const { EyeOpenIcon, EyeClosedIcon } = window.RadixIcons;

    const handleSwitchChange = (checked) => {
        onChange(checked ? true : null);
    };

    const handleIconClick = () => {
        if (!isEnabled) return;
        onChange(value !== true);
    };

    return (
        <Flex align="center" justify="between" style={{ width: '100%', padding: '12px', fontSize: '14px', paddingTop: '4px', paddingBottom: '4px' }}>
            {label}
            <Flex align="center" gap="2">
                <Switch
                    size="1"
                    checked={isEnabled}
                    onCheckedChange={handleSwitchChange}
                />
                <IconButton
                    title={
                    value == null? '' :
                        value === true ? 'Included' : 'Excluded'}
                    variant="soft" 
                    size="1"
                    disabled={!isEnabled}
                    onClick={handleIconClick}
                >
                    {value === true || value === null ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </IconButton>
            </Flex>
        </Flex>
    );
};

const SearchMenu = ({ onSync, isSyncing, searchOpts, setSearchOpts, syncStatus }) => {
    const { Text, IconButton, DropdownMenu } = window.RadixUI;
    const { DotsHorizontalIcon } = window.RadixIcons;

    const getSyncStatusColor = (status) => {
        switch (status) {
            case 'Fully Synced':
                return 'green';
            case 'Partially synced':
                return 'yellow';
            default:
                return 'red';
        }
    };

    const handleFilterChange = (key, value) => {
        setSearchOpts(prev => ({ ...prev, [key]: value }));
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <IconButton variant="ghost" style={{ padding: '8px' }}>
                    <DotsHorizontalIcon />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <Text style={{ fontSize: '14px', padding: '4px' }} color={'gray'}>
                    DB Status: <Text color={getSyncStatusColor(syncStatus)}>{syncStatus}</Text>
                </Text>
                <DropdownMenu.Item
                    onSelect={onSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Syncing...' : 'Sync notes with LocalVecDB'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <Text color="gray" style={{ fontSize: '14px', padding: '4px' }}>Search Options</Text>
                <FilterRow
                    label="Archived"
                    isEnabled={searchOpts.isArchived !== null}
                    value={searchOpts.isArchived}
                    onChange={(value) => handleFilterChange('isArchived', value)}
                />
                <FilterRow
                    label="Task List"
                    isEnabled={searchOpts.isTaskListNote !== null}
                    value={searchOpts.isTaskListNote}
                    onChange={(value) => handleFilterChange('isTaskListNote', value)}
                />
                <FilterRow
                    label="Published"
                    isEnabled={searchOpts.isPublished !== null}
                    value={searchOpts.isPublished}
                    onChange={(value) => handleFilterChange('isPublished', value)}
                />
                <FilterRow
                    label="Shared by Me"
                    isEnabled={searchOpts.isSharedByMe !== null}
                    value={searchOpts.isSharedByMe}
                    onChange={(value) => handleFilterChange('isSharedByMe', value)}
                />
                <FilterRow
                    label="Shared with Me"
                    isEnabled={searchOpts.isSharedWithMe !== null}
                    value={searchOpts.isSharedWithMe}
                    onChange={(value) => handleFilterChange('isSharedWithMe', value)}
                />
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

const NoteCard = ({ title, noteContentPart, noteUUID , headingAnchor }) => {
    const {Card, Flex} = window.RadixUI;
    const handleClick = (e) => {
        e.preventDefault();
        window.appConnector.navigate(`https://www.amplenote.com/notes/${noteUUID}` + (headingAnchor ? `#${headingAnchor}` : ''));
    };

    return (
        <Card style={{padding: '16px'}} asChild>
            <a href="#" onClick={handleClick}>
                <Flex direction="column" gap="2">
                    <h3 style={{margin: '0 0 8px 0', fontSize: '18px'}}>
                        {title || 'Untitled Note'}
                    </h3>
                    <p style={{margin: 0, color: '#666', fontSize: '14px'}}>
                        {truncate(noteContentPart, {length: 150})}
                    </p>
                </Flex>
            </a>
        </Card>
    );
};

export const SearchApp = () => {
    const {
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
    } = useSearch();

    const {Theme, ScrollArea, Flex, TextField} = window.RadixUI;
    const {MagnifyingGlassIcon, Cross2Icon} = window.RadixIcons;

    return (
        <Theme appearance="dark" accentColor="blue">
            <Flex direction="column" gap="3" style={{ height: '100vh', padding: '16px' }}>
                <Flex align="center" gap="2">
                    <TextField.Root
                        placeholder="Search notes..."
                        variant="soft"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '16px',
                            flex: 1
                        }}
                        autoFocus={true}
                    >
                        <TextField.Slot style={{ paddingLeft: '2px' }}>
                            <MagnifyingGlassIcon height="16" width="16" />
                        </TextField.Slot>
                        {searchText && (
                            <TextField.Slot style={{ paddingRight: '0px' }}>
                                <Cross2Icon
                                    height="16"
                                    width="16"
                                    style={{
                                        cursor: 'pointer',
                                        opacity: 0.7,
                                    }}
                                    onClick={() => setSearchText('')}
                                />
                            </TextField.Slot>
                        )}
                    </TextField.Root>
                    <SearchMenu
                        onSync={handleSync}
                        isSyncing={isSyncing}
                        searchOpts={searchOpts}
                        setSearchOpts={setSearchOpts}
                        syncStatus={syncStatus}
                    />
                </Flex>

                <ScrollArea style={{ flex: 1 }}>
                    <Flex direction="column" gap="3">
                        <SearchStatus
                            isLoading={isLoading}
                            error={error}
                            isSyncing={isSyncing}
                            syncProgressText={syncProgressText}
                            syncError={syncError}
                            searchText={searchText}
                            searchResults={searchResults}
                        />
                        {!isLoading && !isSyncing && !error && !syncError &&
                            searchResults.map((result, index) => (
                                <NoteCard
                                    key={index}
                                    title={result.noteTitle}
                                    noteContentPart={result.noteContentPart}
                                    noteUUID={result.noteUUID}
                                    headingAnchor={result.headingAnchor}
                                />
                            ))}
                    </Flex>
                </ScrollArea>
            </Flex>
        </Theme>
    );
};

