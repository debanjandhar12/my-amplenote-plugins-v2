import {EndlessScroll} from "./components/EndlessScroll.jsx";
import {NoteCard} from "./components/NoteCard.jsx";
import {useSearch} from "./hooks/useSearch.jsx";

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
                        <Text size="1" dangerouslySetInnerHTML={{ __html: syncProgressText }} />
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
    const { Tooltip, Switch, IconButton, Flex } = window.RadixUI;
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
                {value === null ?
                    <IconButton
                        variant="soft"
                        size="1"
                        disabled={true}
                        onClick={handleIconClick}>
                        <EyeOpenIcon />
                    </IconButton>
                    :
                    <Tooltip content={value === true ? 'Included' : 'Excluded'}>
                        <IconButton
                            variant="soft"
                            size="1"
                            onClick={handleIconClick}>
                            {value === true ? <EyeOpenIcon /> : <EyeClosedIcon />}
                        </IconButton>
                    </Tooltip>
                }
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
                <IconButton variant="ghost" style={{ padding: '8px' }} className={'search-menu-button'}>
                    <DotsHorizontalIcon />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className={'search-menu-content'}>
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

    const {Theme, Flex, TextField} = window.RadixUI;
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
                        className="search-input"
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
                <SearchStatus
                    isLoading={isLoading}
                    error={error}
                    isSyncing={isSyncing}
                    syncProgressText={syncProgressText}
                    syncError={syncError}
                    searchText={searchText}
                    searchResults={searchResults}
                />
                {!isLoading && !isSyncing && !error && !syncError && searchResults && searchResults.length > 0 &&
                    <EndlessScroll
                        iterationCnt={6}
                        itemContent={(index) => (
                            <NoteCard
                                title={searchResults[index].noteTitle}
                                actualNoteContentPart={searchResults[index].actualNoteContentPart}
                                noteUUID={searchResults[index].noteUUID}
                                headingAnchor={searchResults[index].headingAnchor}
                            />
                        )}
                        data={searchResults}
                    />
                }
            </Flex>
        </Theme>
    );
};
