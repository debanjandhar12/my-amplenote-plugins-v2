import {convertUIToolsToDummyServerTools} from "../../backend/utils/convertUIToolsToDummyServerTools.js";
import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";
import {getSystemMessage} from "./getSystemMessage.jsx";

export function useModelContext() {
    const runtime = AssistantUI.useAssistantRuntime();

    React.useEffect(() => {
        let removeLastRegisteredModelContextProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            removeLastRegisteredModelContextProvider();
            const toolsToAdd = ToolRegistry.getAllTools().filter(tool => tool.unstable_tool.triggerCondition({
                lastUserMessage,
                allUserMessages
            }));
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
    }, [runtime]);
}
