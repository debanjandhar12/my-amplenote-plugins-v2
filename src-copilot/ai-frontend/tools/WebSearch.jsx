import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const WebSearch = () => {
    return createGenericReadTool({
        toolName: "WebSearch",
        description: "Search web for information. Use only when asked to search or to answer questions about current events.",
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
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@web")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const searchResults = await search(args.query, signal);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult(`Search completed. Search Result: ${JSON.stringify(searchResults)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.searchResults)}
                                              text={`Search completed!`}/>
        }
    });
}

const search = async (query, signal) => {
    // Use jira reader as cors bypass and access to searx
    // const response = await fetch(`https://r.jina.ai/https://search.projectsegfau.lt/search?q=${encodeURIComponent(query)}&format=json`, {
    //     signal,
    //     headers: {
    //         "Accept": "application/json"
    //     }
    // });
    const response = await fetch(`https://actions.sider.ai/googleGPT/search_with_rerank?query=${encodeURIComponent(query)}`);
    // Use duckduckgo as fallback
    if (response.status !== 200) {
        const response2 = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`,
            {signal});
        if (response2.status === 200) {
            return [await response2.json()];
        }
        throw new Error('Failed to fetch web search results');
    }
    return await response.json();
}