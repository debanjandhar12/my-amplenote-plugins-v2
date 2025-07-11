import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";
import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {errorToString} from "../helpers/errorToString.js";
import {uniqBy} from "lodash-es";
import {stripYAMLFromMarkdown} from "../../markdown/stripYAMLFromMarkdown.js";
import {processAndMergeCopilotDBResults} from "../helpers/processAndMergeCopilotDBResults.js";

export const SearchNotesByTitleTagsContent = () => {
    return createGenericReadTool({
        toolName: "SearchNotesByTitleTagsContent",
        description: "Use to get noteUUID from title / tags OR search note content. Only provide required parameters. Returns list of note uuids.",
        parameters: {
            type: "object",
            properties: {
                noteContent: {
                    type: "string",
                    description: "Search string"
                },
                noteTitle: {
                    type: "string",
                    description: "Title to filter by"
                },
                tags: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "Tags to filter notes by"
                },
                isArchived: {
                    type: "boolean",
                    description: "When true, only search archived notes (Default: null)"
                },
                isSharedByMe: {
                    type: "boolean",
                    description: "When true, only search notes shared by user (Default: null)"
                },
                isSharedWithMe: {
                    type: "boolean",
                    description: "When true, only search notes shared with user (Default: null)"
                },
                strictSearch: {
                    type: "boolean",
                    description: "When true, strictly match tags and title"
                },
                limitSearchResults: {
                    type: "number",
                    description: "Search result limit (Default: 10)"
                }
            }
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        renderInit: ({args, formData}) => {
            const {copilotDBSearchError} = formData;
            const {Flex, Text, Spinner} = window.RadixUI;
            const {ExclamationTriangleIcon} = window.RadixIcons;
            if (copilotDBSearchError) {
                return <ToolCardContainer>
                    <Flex direction="column" gap="2">
                        <Flex style={{ alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }}>
                            <ExclamationTriangleIcon />
                            <Text style={{ color: 'crimson' }}>
                                CopilotDB search failed: {errorToString(formData.copilotDBSearchError)}
                            </Text>
                        </Flex>
                        <Flex style={{ alignItems: 'center', gap: '8px' }}>
                            <Spinner />
                            <Text>
                                Searching user notes using fallback amplenote built-in search...
                            </Text>
                        </Flex>
                    </Flex>
                </ToolCardContainer>
            }
            return <ToolCardMessage text={`Searching user notes using CopilotDB...`}
                                    icon={<Spinner />} />
        },
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            let copilotDBSearchError = null;

            // Perform CopilotDB-decrypted search
            let searchResults0 = [];
            try {
                // TODO: pass signal
                if (args.noteContent && args.noteContent.trim() !== '') {
                    args.limitSearchResults = args.limitSearchResults || 10;
                    const results = await appConnector.searchNotesInCopilotDB(args.noteContent, "query", {
                        limit: Math.floor((args.limitSearchResults * 3) / 2),
                        isArchived: args.isArchived, isSharedByMe: args.isSharedByMe,
                        isSharedWithMe: args.isSharedWithMe
                    });
                    searchResults0.push(...await processAndMergeCopilotDBResults(results));
                }
            } catch (e) {
                copilotDBSearchError = e;
                setFormData({...formData, copilotDBSearchError: copilotDBSearchError});
                console.error(copilotDBSearchError);
            }

            // Perform amplenote search
            const groups = [];
            if (args.isArchived === true) groups.push('archived');
            if (args.isSharedByMe === true) groups.push('shared');
            if (args.isSharedWithMe === true) groups.push('shareReceived');
            // TODO: Handle false explicitly set by llm but we have
            //  no group for unarchived, unshared, unshareReceived currently
            // TODO 2: None of below are full text search. Need to add full text search support.
            const searchResults1 = args.noteTitle ? [await appConnector.findNote({
                name: args.noteTitle
            })] : [];
            const searchResults2 = args.noteTitle ? await appConnector.filterNotes({
                query: args.noteTitle,
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];
            const searchResults3 = args.noteContent ? await appConnector.filterNotes({
                query: args.noteContent,
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];
            const searchResults4 = args.tags ? await appConnector.filterNotes({
                tag: args.tags.join(','),
                ...(groups.length > 0 && { group: groups.join(',') })
            }) : [];
            const searchResults5 = !args.noteTitle && !args.noteContent && groups.length > 0
                ? await appConnector.filterNotes({
                group: groups.join(',')
            }) : [];

            // Add matched part using fuzzy search for amplenote built-in search results
            const amplenoteSearchResults = [...searchResults1, ...searchResults2, ...searchResults3, ...searchResults4, ...searchResults5];
            for (const result of amplenoteSearchResults) {
                if (!args.noteContent || args.noteContent.trim() === '') continue;
                const matchedParts = await appConnector.getMatchedPartWithFuzzySearch(result.noteUUID || result.uuid, args.noteContent.trim());
                if (matchedParts.length > 0) {
                    result.actualNoteContentPart = await stripYAMLFromMarkdown(matchedParts[0]);
                }
            }

            // Count occurrences of each UUID across all search methods and sort by count
            const uuidCounts = {};
            const allSearchResults = [...searchResults0, ...amplenoteSearchResults].filter(x => x && (x.uuid || x.noteUUID));

            // Filter by group is always strict if specified
            const allSearchResultsFilteredByGroup = await Promise.all(allSearchResults.filter(async result => {
                let satisfiesGroup = true;
                if (groups.includes("archived")) {
                    const isArchived = await appConnector.filterNotes({
                        group: "archived",
                        query: result.uuid
                    });
                    satisfiesGroup = satisfiesGroup && isArchived && isArchived.length > 0;
                }
                if (groups.includes("shared")) {
                    const isShared = await appConnector.filterNotes({
                        group: "shared",
                        query: result.uuid
                    });
                    satisfiesGroup =  satisfiesGroup && isShared && isShared.length > 0;
                }
                if (groups.includes("shareReceived")) {
                    const isShareReceived = await appConnector.filterNotes({
                        group: "shareReceived",
                        query: result.uuid
                    });
                    satisfiesGroup = satisfiesGroup && isShareReceived && isShareReceived.length > 0;
                }
                return satisfiesGroup;
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
                    tags: args.tags && note.tags && typeof note.tags === 'string' ?
                        note.tags.split(',') : note.tags,
                    ...(note.actualNoteContentPart && { actualNoteContentPart: note.actualNoteContentPart })
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

            setFormData({...formData, searchResults: searchResultsMapped,
                copilotDBSearchError});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult({resultSummary: `Search completed.`, searchResults});
        },
        renderCompleted: ({formData, toolName, args}) => {
            const {Flex, Text} = window.RadixUI;
            const {MagnifyingGlassIcon, ExclamationTriangleIcon} = window.RadixIcons;
            if (formData.copilotDBSearchError) {
                return <ToolCardResultMessage
                    result={JSON.stringify(formData.searchResults)}
                    toolName={toolName}
                    input={args}>
                    <Flex direction="column" gap="2">
                        <Flex style={{ alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }}>
                            <ExclamationTriangleIcon />
                            <Text style={{ color: 'crimson' }}>
                                CopilotDB search failed: {errorToString(formData.copilotDBSearchError)}
                            </Text>
                        </Flex>
                        <Flex style={{ alignItems: 'center', gap: '8px' }}>
                            <MagnifyingGlassIcon />
                            <Text>
                                Search completed using fallback amplenote built-in search. {formData.searchResults.length} results fetched.
                            </Text>
                        </Flex>
                    </Flex>
                </ToolCardResultMessage>
            }
            return <ToolCardResultMessage
                result={JSON.stringify(formData.searchResults)}
                icon={<MagnifyingGlassIcon/>}
                toolName={toolName}
                text={`Search completed! ${formData.searchResults.length} results fetched.`}
                input={args}/>;
        }
    });
};