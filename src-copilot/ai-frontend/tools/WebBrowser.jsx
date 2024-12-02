import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";
import {ToolCardResultMessage} from "../components/ToolCardResultMessage.jsx";
import {ToolCardMessage} from "../components/ToolCardMessage.jsx";

export const WebBrowser = () => {
    return createGenericReadTool({
        toolName: "WebBrowser",
        description: "Read entire webpage content. Don't call this again if page content is already fetched.",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    minLength: 1
                }
            },
            required: ["url"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@web")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const url = args.url;
            const pageContent = await getWebPageContent(url, signal);
            setFormData({...formData, pageContent});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {pageContent} = formData;
            addResult(`Fetched Page content: ${pageContent}`);
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