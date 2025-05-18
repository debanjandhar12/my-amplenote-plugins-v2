import {ToolCardContainer} from "../components/tools-ui/ToolCardContainer.jsx";
import {ToolCardErrorMessage} from "../components/tools-ui/ToolCardErrorMessage.jsx";
import {createMCPToolFromObj} from "../tools-core/mcp/createMCPToolFromObj.jsx";
import {ToolCardResultMessage} from "../components/tools-ui/ToolCardResultMessage.jsx";
import {get} from "lodash-es";

export const CustomToolFallback = (toolInfoObj) => {
    if (toolInfoObj.toolName.startsWith('mcp-')) {
        if (toolInfoObj.status.type === 'complete') {
            const { MixIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                text={`mcp/${toolInfoObj.toolName} tool call completed successfully.`}
                icon={<MixIcon />}
                toolName={`mcp/${toolInfoObj.toolName}`}
                input={toolInfoObj.args}
                disabled={true}/>
        }

        return null;
    }

    return (
        <ToolCardErrorMessage
            text={`Unknown tool: ${toolInfoObj.toolName}`}
            />
    );
}