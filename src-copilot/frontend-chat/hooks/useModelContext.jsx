import {convertUIToolsToDummyServerTools} from "../../aisdk-wrappers/utils/convertUIToolsToDummyServerTools.js";
import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";
import {getSystemMessage} from "../helpers/getSystemMessage.js";
import {getEnabledToolsContext} from "../context/EnabledToolsContext.jsx";

export function useModelContext() {
    const runtime = AssistantUI.useAssistantRuntime();
    const enabledToolsContext = React.useContext(getEnabledToolsContext());
    
    // Add defensive programming for context values
    const { enabledTools, isToolEnabled } = enabledToolsContext || {};
    const safeIsToolEnabled = typeof isToolEnabled === 'function' ? isToolEnabled : () => true;

    React.useEffect(() => {
        let removeLastRegisteredModelContextProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            removeLastRegisteredModelContextProvider();
            
            // Filter tools based on GUI selection instead of text-based triggers
            const toolsToAdd = ToolRegistry.getAllTools().filter(tool => {
                const toolCategory = tool.unstable_tool.category;
                return toolCategory && safeIsToolEnabled(toolCategory);
            });
            
            removeLastRegisteredModelContextProvider = runtime.registerModelContextProvider({
                getModelContext: () => {
                    const systemMsg = getSystemMessage(currentMessages, toolsToAdd);
                    return {
                        tools: convertUIToolsToDummyServerTools([...toolsToAdd]),
                        system: systemMsg
                    }
                }
            });
        });
        return () => {
            removeLastRegisteredModelContextProvider();
        };
    }, [runtime, enabledTools, safeIsToolEnabled]);
}
