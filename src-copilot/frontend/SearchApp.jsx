import {truncate, debounce} from "lodash-es";
import {processVectorDBResults} from "./tools-core/utils/processVectorDBResults.js";

// Custom hook for search functionality
const useSearch = () => {
    // State management
    const [searchText, setSearchText] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncError, setSyncError] = React.useState(null);
    const [searchOpts, setSearchOpts] = React.useState({isArchived: false});

    // Search functionality
    const performSearch = async (query, opts = {}) => {
        if (!query.trim()) return [];

        const results = await window.appConnector.searchInLocalVecDB(query);
        const processedResults = await processVectorDBResults(results);

        // Filter results
        const checkIsArchived = async (uuid) => {
            const note = await appConnector.filterNotes({
                group: "archived",
                query: uuid
            });
            return note && note.length > 0;
        };
        const filteredProcessedResults = await Promise.all(processedResults.filter(async (result) => {
            const isArchived = await checkIsArchived(result.uuid);
            return opts.isArchived === null || isArchived === opts.isArchived;
        }));

        return filteredProcessedResults.length > 10 ?
            filteredProcessedResults.slice(0, 10) : filteredProcessedResults;
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
                console.error('Search error:', error);
                setError(error.message || 'An error occurred while searching');
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
        handleSync,
        searchOpts,
        setSearchOpts
    };
};

// SearchStatus component to handle different states
const SearchStatus = ({ isLoading, error, isSyncing, syncError, searchText, searchResults }) => {
    const {Flex, Box, Spinner, Text} = window.RadixUI;

    if (isSyncing) {
        return (
            <Box style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '6px' }}>
                Syncing notes with Pinecone...
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

const SearchMenu = ({ onSync, isSyncing, searchOpts, setSearchOpts }) => {
    const { Text, IconButton, DropdownMenu, Switch, Flex } = window.RadixUI;
    const { DotsHorizontalIcon } = window.RadixIcons;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <IconButton variant="ghost" style={{ padding: '8px' }}>
                    <DotsHorizontalIcon />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Item
                    onSelect={onSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Syncing...' : 'Sync notes with Pinecone'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <Text color="gray" style={{ fontSize: '14px', padding: '4px' }}>Search Options</Text>
                <Flex align="center" justify="between" style={{ width: '100%', padding: '12px', fontSize: '14px', paddingTop: '4px', paddingBottom: '4px' }}>
                    Archived
                    <Switch
                        checked={searchOpts.isArchived}
                        onCheckedChange={(checked) => setSearchOpts({ ...searchOpts, isArchived: checked })}
                    />
                </Flex>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

const NoteCard = ({ title, content, noteUUID }) => {
    const {Card, Flex} = window.RadixUI;
    const handleClick = (e) => {
        e.preventDefault();
        window.appConnector.navigate(`https://www.amplenote.com/notes/${noteUUID}`);
    };

    return (
        <Card style={{padding: '16px'}} asChild>
            <a href="#" onClick={handleClick}>
                <Flex direction="column" gap="2">
                    <h3 style={{margin: '0 0 8px 0', fontSize: '18px'}}>
                        {title || 'Untitled Note'}
                    </h3>
                    <p style={{margin: 0, color: '#666', fontSize: '14px'}}>
                        {truncate(content, {length: 150})}
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
        handleSync,
        searchOpts,
        setSearchOpts
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
                    />
                </Flex>

                <ScrollArea style={{ flex: 1 }}>
                    <Flex direction="column" gap="3">
                        <SearchStatus
                            isLoading={isLoading}
                            error={error}
                            isSyncing={isSyncing}
                            syncError={syncError}
                            searchText={searchText}
                            searchResults={searchResults}
                        />
                        {!isLoading && !isSyncing && !error && !syncError &&
                            searchResults.map((result, index) => (
                                <NoteCard
                                    key={index}
                                    title={result.noteTitle}
                                    content={result.content}
                                    noteUUID={result.noteUUID}
                                />
                            ))}
                    </Flex>
                </ScrollArea>
            </Flex>
        </Theme>
    );
};

