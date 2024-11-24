import {Pinecone} from "../pinecone/Pinecone.js";
import {removeYAMLFrontmatterFromMarkdown} from "../pinecone/removeYAMLFrontmatterFromMarkdown.js";
import {truncate} from "lodash-es";

export const SearchApp = () => {
    const [searchText, setSearchText] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncError, setSyncError] = React.useState(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            await window.appConnector.syncNotesWithPinecone();
            // Re-run the search if there's a search query
            if (searchText.trim()) {
                await fetchResults();
            }
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError(error.message || 'Failed to sync notes');
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchResults = async () => {
        if (!searchText.trim()) {
            setSearchResults([]);
            setError(null);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
            const pinecone = new Pinecone();
            const results = await pinecone.search(searchText, appSettings, 10);
            const filteredResults = results.filter(result => result.score >= 0.75);
            const uniqueResults = Object.values(
                filteredResults.reduce((acc, result) => {
                    const uuid = result.metadata.noteUUID;
                    if (!acc[uuid] || acc[uuid].score < result.score) {
                        acc[uuid] = result;
                    }
                    return acc;
                }, {})
            ).sort((a, b) => b.score - a.score);
            setSearchResults(await Promise.all(uniqueResults.map(async (result) => ({
                noteTitle: result.metadata.noteTitle,
                content: await removeYAMLFrontmatterFromMarkdown(result.metadata.pageContent),
                noteUUID: result.metadata.noteUUID,
            }))));
        } catch (error) {
            console.error('Search error:', error);
            setError(error.message || 'An error occurred while searching');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        const debounceTimer = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchText]);

    const {Theme, ScrollArea, Flex, Box, TextField} = window.RadixUI;
    const {MagnifyingGlassIcon} = window.RadixIcons;
    return (
        <Theme appearance="dark" accentColor="blue">
            <Flex direction="column" gap="3" style={{ height: '100vh', padding: '16px' }}>
                <Flex align="center" gap="2">
                    <TextField.Root placeholder="Search notes..."
                                    variant="soft"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '16px',
                                        flex: 1
                                    }}>
                        <TextField.Slot>
                            <MagnifyingGlassIcon height="16" width="16" />
                        </TextField.Slot>
                    </TextField.Root>
                    <SearchMenu onSync={handleSync} isSyncing={isSyncing} />
                </Flex>

                <ScrollArea style={{ flex: 1 }}>
                    <Flex direction="column" gap="3">
                        {isSyncing ? (
                            <Box style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '6px' }}>
                                Syncing notes with Pinecone...
                            </Box>
                        ) : syncError ? (
                            <Box style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#e11d48',
                                backgroundColor: '#ffe4e6',
                                borderRadius: '6px'
                            }}>
                                {syncError}
                            </Box>
                        ) : isLoading ? (
                            <Box style={{ padding: '20px', textAlign: 'center' }}>
                                Loading...
                            </Box>
                        ) : error ? (
                            <Box style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#e11d48',
                                backgroundColor: '#ffe4e6',
                                borderRadius: '6px'
                            }}>
                                {error}
                            </Box>
                        ) : searchResults.length === 0 ? (
                            <Box style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                {searchText.trim() ? 'No results found' : 'Start typing to search your notes'}
                            </Box>
                        ) : (
                            searchResults.map((result, index) => (
                                <NoteCard
                                    key={index}
                                    title={result.noteTitle}
                                    content={result.content}
                                    noteUUID={result.noteUUID}
                                />
                            ))
                        )}
                    </Flex>
                </ScrollArea>
            </Flex>
        </Theme>
    );
}

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
    const {Card, Flex, Box} = window.RadixUI;
    return (
        <Card style={{padding: '16px'}} asChild>
            <a href="#" onClick={() => window.appConnector.navigate(`https://www.amplenote.com/notes/${noteUUID}`)}>
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
