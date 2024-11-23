import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {getCorsBypassUrl} from "../../../common-utils/cors-helpers.js";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const WebSearch = () => {
    return createGenericReadTool({
        toolName: "WebSearch",
        description: "Search web for information",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search string",
                    minLength: 1
                }
            },
            required: ["query"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@web-search")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState}) => {
            const searchResults = await search(args.query);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult(`Search completed. Search Result: ${JSON.stringify(searchResults)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.searchResults)}
                                              text={`Search completed! ${formData.searchResults.length} results fetched.`}/>
        }
    });
}

const search = async (query) => {
    // Other known searx instances: https://searx.perennialte.ch/search, https://searx.foss.family/search, https://search.mdosch.de/searxng/search
    const response = await fetch(getCorsBypassUrl(`https://search.projectsegfau.lt/search?q=${encodeURIComponent(query)}&format=json`));
    // use duckduckgo if searx fails
    if (response.status !== 200) {
        const response2 = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
        if (response2.status === 200) {
            return [await response2.json()];
        }
        throw new Error('Failed to fetch web search results');
    }
    return (await response.json()).results;
}