import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {Pinecone} from "../../pinecone/Pinecone.js";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {errorToString} from "../utils/errorToString.js";
import {uniqBy} from "lodash-es";

export const SearchNotesByTitleTagsContent = () => {
    return createGenericReadTool({
        toolName: "SearchNotesByTitleTagsContent",
        description: "Use to get noteUUID from title / tags OR search note content. Only provide required parameters. Returns only list of note uuids.",
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
        onInit: async ({args, formData, setFormData, setFormState}) => {
            console.log('SearchNotesByTitleTagsContent onInit', args);
            let isPineconeSearchPossible = false;
            if (!args.noteTitle && !args.tags) {
                isPineconeSearchPossible = true;
            }
            setFormData({...formData, isPineconeSearchPossible: false});
            try {
                if (isPineconeSearchPossible) {
                    const pinecone = new Pinecone();
                    const searchResults = await pinecone.search(args.noteContent, appSettings, 4);
                    setFormData({...formData, searchResults});
                    setFormState('completed');
                    return;
                }
            } catch (e) {
                console.error(e);
                setFormData({...formData, pineconeError: e});
            }
            const searchResults1 = args.noteTitle ? [await appConnector.findNote({
                name: args.noteTitle,
                tags: args.tags && args.tags.length > 0 ? args.tags : undefined,
            })] : [];
            const searchResults2 = args.noteContent ? await appConnector.filterNotes({
                query: args.noteContent,
                tag: args.tags && args.tags.length > 0 ? args.tags.join(',') : undefined,
            }) : [];
            const searchResults3 = args.noteTitle ? await appConnector.filterNotes({
                query: args.noteTitle,
                tag: args.tags && args.tags.length > 0 ? args.tags.join(',') : undefined,
            }) : [];
            const searchResults4 = (args.tags && !args.noteTitle && !args.noteContent) ? await appConnector.filterNotes({
                tag: args.tags && args.tags.length > 0 ? args.tags.join(',') : undefined,
            }) : [];
            console.log(searchResults1, searchResults2, searchResults3, searchResults4);
            const searchResults = uniqBy([...searchResults1, ...searchResults2,
                ...searchResults3, ...searchResults4].filter(x => x && x.uuid), 'uuid');
            const searchResultsMapped = searchResults.map(note => ({
                uuid: note.uuid,
                title: note.name,
                tags: note.tags
            }));
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