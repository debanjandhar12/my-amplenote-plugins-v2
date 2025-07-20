import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";

export const WebBrowser = () => {
    return createGenericReadTool({
        toolName: "WebBrowser",
        description: "Read entire webpage content. Don't call this again if page content is already fetched.",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string"
                }
            },
            required: ["url"]
        },
        category: "web",
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const url = args.url;
            const pageContent = await getWebPageContent(url, signal);
            setFormData({...formData, pageContent});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {pageContent} = formData;
            addResult({resultSummary: `Page content fetched successfully.`, pageContent});
        },
        renderInit: ({args}) => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Fetching page content for ${args.url}...`} icon={<Spinner />} />
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { GlobeIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={formData.pageContent}
                text={`Page content fetched successfully.`}
                icon={<GlobeIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}

export const getWebPageContent = async (url, signal) => {
    const response = await fetch(`https://r.jina.ai/${url.trim()}`, {
        signal
    });
    if (response.status !== 200) {
        throw new Error('Failed to fetch web page content');
    }
    return await response.text();
}
