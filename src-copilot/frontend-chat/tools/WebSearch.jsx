import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";
import {fetchWithFallback, getCorsBypassUrl} from "../../../common-utils/cors-helpers.js";

export const WebSearch = () => {
    return createGenericReadTool({
        toolName: "WebSearch",
        description: "Search web for information. Use only when asked to search or to answer questions about current events.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search string"
                }
            },
            required: ["query"]
        },
        group: "web",
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const searchResults = await search(args.query, signal);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult({resultSummary: `Search completed.`, searchResults});
        },
        renderInit: ({args}) => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Searching web for ${args.query}...`} icon={<Spinner />} />
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { GlobeIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.searchResults)}
                text={`Search completed!`}
                icon={<GlobeIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

const search = async (query, signal) => {
    const response = await fetchWithFallback([`https://actions.sider.ai/googleGPT/search_with_rerank?query=${encodeURIComponent(query)}`,
        getCorsBypassUrl(`https://search.projectsegfau.lt/search?q=${encodeURIComponent(query)}&format=json`),
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
    ]);
    if (response.status !== 200) {
        throw new Error('Failed to fetch web search results');
    }
    return await response.json();
}
