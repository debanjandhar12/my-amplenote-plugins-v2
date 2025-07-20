import {convertUIToolsToDummyServerTools} from "../../aisdk-wrappers/utils/convertUIToolsToDummyServerTools.js";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {getSystemMessage} from "../helpers/getSystemMessage.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export function useModelContext() {
    const runtime = AssistantUI.useAssistantRuntime();
    const chatAppContext = React.useContext(getChatAppContext());
    
    // Add defensive programming for context values
    const { enabledTools, isToolEnabled } = chatAppContext || {};
    const safeIsToolEnabled = typeof isToolEnabled === 'function' ? isToolEnabled : () => false;

    React.useEffect(() => {
        let removeLastRegisteredModelContextProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            removeLastRegisteredModelContextProvider();
            
            // Get tools based on enabled categories using ToolCategoryRegistry
            const toolsToAdd = [];
            const allCategoryNames = ToolCategoryRegistry.getAllCategoriesNames();
            
            for (const categoryName of allCategoryNames) {
                if (safeIsToolEnabled(categoryName)) {
                    const categoryTools = ToolCategoryRegistry.getToolsByCategory(categoryName);
                    toolsToAdd.push(...categoryTools);
                }
            }
            
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
