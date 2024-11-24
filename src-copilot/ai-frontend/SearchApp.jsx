import {Pinecone} from "../pinecone/Pinecone.js";
import {removeYAMLFrontmatterFromMarkdown} from "../pinecone/removeYAMLFrontmatterFromMarkdown.js";
import {truncate, debounce} from "lodash-es";

// Custom hook for search functionality
const useSearch = () => {
    // State management
    const [searchText, setSearchText] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncError, setSyncError] = React.useState(null);

    // Search functionality
    const performSearch = async (query) => {
        if (!query.trim()) return [];
        
        const pinecone = new Pinecone();
        const results = await pinecone.search(query, appSettings, 10);
        return processSearchResults(results);
    };

    const processSearchResults = async (results) => {
        const filteredResults = results
            .filter(result => result.score >= 0.75)
            .reduce((acc, result) => {
                const uuid = result.metadata.noteUUID;
                if (!acc[uuid] || acc[uuid].score < result.score) {
                    acc[uuid] = result;
                }
                return acc;
            }, {});

        const uniqueResults = Object.values(filteredResults)
            .sort((a, b) => b.score - a.score);

        return Promise.all(
            uniqueResults.map(async (result) => ({
                noteTitle: result.metadata.noteTitle,
                content: await removeYAMLFrontmatterFromMarkdown(result.metadata.pageContent),
                noteUUID: result.metadata.noteUUID,
            }))
        );
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
                const results = await performSearch(searchText);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
                setError(error.message || 'An error occurred while searching');
            } finally {
                setIsLoading(false);
            }
        }, 320),
        [searchText]
    );

    const handleSearch = React.useCallback(() => {
        debouncedSearch();
    }, [debouncedSearch, searchText]);

    // Sync functionality
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(null);

        try {
            await window.appConnector.syncNotesWithPinecone();
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
    }, [searchText, handleSearch]);

    // Public interface
    return {
        searchText,
        setSearchText,
        searchResults,
        isLoading,
        error,
        isSyncing,
        syncError,
        handleSync
    };
};

// SearchStatus component to handle different states
const SearchStatus = ({ isLoading, error, isSyncing, syncError, searchText, searchResults }) => {
    const {Box} = window.RadixUI;

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
                Loading...
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

const SearchMenu = ({ onSync, isSyncing }) => {
    const {IconButton, DropdownMenu} = window.RadixUI;
    const {DotsHorizontalIcon} = window.RadixIcons;
    
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
        handleSync
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
                    <SearchMenu onSync={handleSync} isSyncing={isSyncing} />
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
