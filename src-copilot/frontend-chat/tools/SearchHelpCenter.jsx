import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {processAndMergeLocalVecDBResults} from "../helpers/processAndMergeLocalVecDBResults.js";

export const SearchHelpCenter = () => {
    return createGenericReadTool({
        toolName: "SearchHelpCenter",
        description: "Search help center",
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
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@help")
            || JSON.stringify(allUserMessages).includes("@all-tools"),
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const results = await appConnector.searchHelpCenter(args.query, {
                limit: 15
            });
            const searchResults = await processAndMergeLocalVecDBResults(results);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult({resultSummary: `Help Center search completed.`, searchResults});
        },
        renderInit: () => {
            const { Spinner } = window.RadixUI;
            return <ToolCardMessage text={`Searching help center...`} icon={<Spinner />} />
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { QuestionMarkCircledIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={JSON.stringify(formData.searchResults)}
                text={`Help Center search completed! Found ${formData.searchResults.length} pages.`}
                icon={<QuestionMarkCircledIcon />}
                toolName={toolName}
                input={args} />
        }
    });
}