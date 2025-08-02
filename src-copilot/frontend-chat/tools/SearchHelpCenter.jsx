import {createGenericReadTool} from "../tools-core/base/createGenericReadTool.jsx";
import {ToolCardMessage} from "../components/tools-ui/ToolCardMessage.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {processAndMergeCopilotDBResults} from "../helpers/processAndMergeCopilotDBResults.js";
import {MAX_TOOL_RESULT_LENGTH2} from "../../constants.js";

export const SearchHelpCenter = () => {
    return createGenericReadTool({
        toolName: "SearchHelpCenter",
        description: "Search help center",
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
        group: "help",
        onInit: async ({args, formData, setFormData, setFormState, signal}) => {
            const results = await appConnector.searchHelpCenter(args.query, {
                limit: 10
            });
            const searchResults = await processAndMergeCopilotDBResults(results);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult({resultSummary: `Help Center search completed.`, searchResults}, MAX_TOOL_RESULT_LENGTH2);
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
