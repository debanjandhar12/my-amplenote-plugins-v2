import {
    convertUIToolsToDummyServerTools
} from "../../aisdk-wrappers/utils/convertUIToolsToDummyServerTools.js";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {getSystemMessage} from "../helpers/getSystemMessage.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";
import {useEnabledTools} from "./useEnabledTools.jsx";

import { getMentionedCategoryNames } from "../helpers/tool-category-mentions.js";

export function useModelContext() {
    const runtime = AssistantUI.useAssistantRuntime();
    const { enabledToolGroups } = React.useContext(getChatAppContext());
    const { enableToolGroup } = useEnabledTools();
    
    // Use a ref to track the current model context unsubscribe function
    const modelContextUnsubscribe = React.useRef(null);

    React.useEffect(() => {
        // Clean up any existing model context registration first
        if (modelContextUnsubscribe.current) {
            modelContextUnsubscribe.current();
            modelContextUnsubscribe.current = null;
        }

        const unsubscribeFromThread = runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            
            // Unsubscribe from previous model context before registering new one
            if (modelContextUnsubscribe.current) {
                modelContextUnsubscribe.current();
            }

            // Register new model context with current messages and tools to be used
            modelContextUnsubscribe.current = runtime.registerModelContextProvider({
                getModelContext: () => {
                    const enabledTools = [];

                    // Get tools based on enabled tools in the composer menu
                    const allCategoryNames = ToolCategoryRegistry.getAllCategoriesNames();
                    for (const categoryName of allCategoryNames) {
                        if (enabledToolGroups.has(categoryName)) {
                            const categoryTools = ToolCategoryRegistry.getToolsByCategory(categoryName);
                            enabledTools.push(...categoryTools);
                        }
                    }

                    // Add additional tools based on last user message
                    const lastUserMessage = currentMessages.filter(msg => msg.role === 'user').pop();
                    if (lastUserMessage && lastUserMessage.content) {
                        for (const contentPart of lastUserMessage.content) {
                            if (contentPart.type === "text" && contentPart.text) {
                                const mentionedCategories = getMentionedCategoryNames(contentPart.text, allCategoryNames);
                                for (const categoryName of mentionedCategories) {
                                    const categoryTools = ToolCategoryRegistry.getToolsByCategory(categoryName);
                                    enabledTools.push(...categoryTools);
                                    enableToolGroup(categoryName);
                                }
                            }
                        }
                    }

                    const systemMsg = getSystemMessage(currentMessages, enabledTools);
                    // console.log('systemMsg', enabledToolGroups, currentMessages, systemMsg, enabledTools);

                    return {
                        priority: Date.now(),
                        tools: enabledTools.length > 0 ? convertUIToolsToDummyServerTools([...enabledTools]) : null,
                        system: systemMsg
                    }
                }
            });
        });

        return () => {
            // Clean up both the thread subscription and the model context
            unsubscribeFromThread();
            if (modelContextUnsubscribe.current) {
                modelContextUnsubscribe.current();
                modelContextUnsubscribe.current = null;
            }
        };
    }, [runtime, enabledToolGroups]);
}