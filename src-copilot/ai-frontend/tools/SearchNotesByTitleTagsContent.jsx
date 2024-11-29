import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {Pinecone} from "../../pinecone/Pinecone.js";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {errorToString} from "../utils/errorToString.js";
import {uniqBy} from "lodash-es";
import {processPineconeSearchResults} from "../utils/processPineconeResults.js";

export const SearchNotesByTitleTagsContent = () => {
    return createGenericReadTool({
        toolName: "SearchNotesByTitleTagsContent",
        description: "Use to get noteUUID from title / tags OR search note content. Only provide required parameters. Returns list of note uuids.",
        parameters: {
            type: "object",
            properties: {
                noteContent: {
                    type: "string",
                    description: "Search string",
                    optional: true
                },
                noteTitle: {
                    type: "string",
                    description: "Note title to filter by",
                    optional: true
                },
                tags: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "Tags to filter notes by",
                    optional: true
                },
                isArchived: {
                    type: "boolean",
                    description: "When true, only search archived notes (Default: null)",
                    optional: true
                },
                isSharedByMe: {
                    type: "boolean",
                    description: "When true, only search notes shared by user (Default: null)",
                    optional: true
                },
                isSharedWithMe: {
                    type: "boolean",
                    description: "When true, only search notes shared with user (Default: null)",
                    optional: true
                },
                strictSearch: {
                    type: "boolean",
                    description: "When true, strictly match tags and title",
                    optional: true
                },
                limitSearchResults: {
                    type: "number",
                    description: "Search result limit (Default: 10)",
                    optional: true
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        renderInit: ({args, formData}) => {
            const {isPineconeSearchPossible, isPineconeError} = formData;
            const {Text} = window.RadixUI;
            const {ExclamationTriangleIcon} = window.RadixIcons;
            if (isPineconeSearchPossible && isPineconeError) {
                return <ToolCardContainer>
                    <Text css={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'crimson' }}>
                        <ExclamationTriangleIcon />
                        Pinecone search failed: {errorToString(formData.pineconeError)}
                    </Text>
                    <Text>Searching for {JSON.stringify(args)} using amplenote built-in search...</Text>
                </ToolCardContainer>
            }
            return <ToolCardMessage text={`Searching for ${JSON.stringify(args)} using amplenote built-in search...`}/>
        },
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            console.log('SearchNotesByTitleTagsContent onInit', args);
            let isPineconeSearchPossible = args.noteContent && args.isArchived === undefined &&
                args.isSharedByMe === undefined && args.isSharedWithMe === undefined;
            setFormData({...formData, isPineconeSearchPossible});
            
            // Perform searches
            let searchResults0 = [];
            try {
                if (isPineconeSearchPossible) {
                    const pinecone = new Pinecone();
                    // TODO: pass signal
                    const pineconeResults = await pinecone.search(args.noteContent, appSettings, args.limitSearchResults);
                    searchResults0.push(...await processPineconeSearchResults(pineconeResults, 0.80));
                }
            } catch (e) {
                console.error(e);
                setFormData({...formData, pineconeError: e});
            }
            const groups = [];
            if (args.isArchived === true) groups.push('archived');
            if (args.isSharedByMe === true) groups.push('shared');
            if (args.isSharedWithMe === true) groups.push('shareReceived');
            // TODO: Handle false explicitly set by llm but we have
            //  no group for unarchived, unshared, unshareReceived currently
            const searchResults1 = args.noteTitle ? [await appConnector.findNote({
                name: args.noteTitle
            })] : [];
            const searchResults2 = args.noteTitle ? await appConnector.filterNotes({
                query: args.noteTitle,
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];
            const searchResults3 = (!args || args.noteContent) ? await appConnector.filterNotes({
                query: args?.noteContent || '',
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];
            const searchResults4 = args.tags ? await appConnector.filterNotes({
                tag: args.tags.join(','),
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];

            // Count occurrences of each UUID across all search methods and sort by count
            const uuidCounts = {};
            const allSearchResults = [...searchResults0, ...searchResults1,
                ...searchResults2, ...searchResults3, ...searchResults4].filter(x => x && (x.uuid || x.noteUUID));
            // Filter by group is always strict if specified
            const allSearchResultsFilteredByGroup = await Promise.all(allSearchResults.filter(async result => {
                if (groups.includes("archived")) {
                    const isArchived = await appConnector.filterNotes({
                        group: "archived",
                        query: result.uuid
                    });
                    return isArchived && isArchived.length > 0;
                } else if (groups.includes("shared")) {
                    const isShared = await appConnector.filterNotes({
                        group: "shared",
                        query: result.uuid
                    });
                    return isShared && isShared.length > 0;
                } else if (groups.includes("shareReceived")) {
                    const isShareReceived = await appConnector.filterNotes({
                        group: "shareReceived",
                        query: result.uuid
                    });
                    return isShareReceived && isShareReceived.length > 0;
                }
                return true;
            }));
            allSearchResultsFilteredByGroup.forEach(result => {
                uuidCounts[result.uuid] = (uuidCounts[result.uuid] || 0) + 1;
            });
            const uniqueResults = uniqBy(allSearchResultsFilteredByGroup, 'uuid');
            const uniqueResultsSortedByCount = uniqueResults.sort((a, b) => {
                if (uuidCounts[b.uuid] !== uuidCounts[a.uuid]) {
                    return uuidCounts[b.uuid] - uuidCounts[a.uuid];
                }
                return a.uuid.localeCompare(b.uuid);
            });

            // Map and sort in a single pass using Array.from
            let searchResultsMapped = Array.from(uniqueResultsSortedByCount)
                .map(note => ({
                    uuid: note.uuid || note.noteUUID,
                    title: note.name || note.title || note.noteTitle,
                    tags: note.tags && typeof note.tags === 'string' ?
                        note.tags.split(',') : note.tags,
                    ...(note.content && { content: note.content })
                }));

            // Apply strict filtering if enabled
            if (args.strictSearch) {
                searchResultsMapped = searchResultsMapped.filter(note => {
                    let matchesTitle = true;
                    let matchesTags = true;

                    if (args.noteTitle) {
                        note.title = note.title || 'Untitled Note';
                        matchesTitle = note.title.toLowerCase().includes(args.noteTitle.toLowerCase());
                    }
                    if (args.tags && args.tags.length > 0) {
                        // Only set true if note contains ALL search tags
                        // The note can have additional tags that are not in the search tags
                        note.tags = note.tags || [];
                        matchesTags = args.tags.every(tag =>
                            note.tags && note.tags.some(noteTag => 
                                noteTag.toLowerCase() === tag.toLowerCase()
                            )
                        );
                    }

                    return matchesTitle && matchesTags;
                });
            }

            // Limit results
            args.limitSearchResults = args.limitSearchResults || 10;
            if (args.limitSearchResults) {
                searchResultsMapped = searchResultsMapped.slice(0, args.limitSearchResults);
            }

            setFormData({...formData, searchResults: searchResultsMapped});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult(`Search completed. Search Result: ${JSON.stringify(searchResults)}`);
        },
        renderCompleted: ({formData}) => {
            let text = `Search completed! ${formData.searchResults.length} results fetched.`;
            if (formData.isPineconeSearchPossible && formData.pineconeError) {
                text = `Search completed using fallback amplenote built-in search. Pinecone failed with error: ${errorToString(formData.pineconeError)}\n ${formData.searchResults.length} results fetched.`;
            }
            return <ToolCardMessageWithResult result={JSON.stringify(formData.searchResults)}
                                              text={text}/>
        }
    });
};