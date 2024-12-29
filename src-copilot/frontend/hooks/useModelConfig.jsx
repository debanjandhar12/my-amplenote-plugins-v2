import {convertUIToolsToDummyServerTools} from "../../backend/utils/convertUIToolsToDummyServerTools.js";
import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";
import {useSystemMessage} from "./useSystemMessage.jsx";

export function useModelConfig(runtime) {
    React.useEffect(() => {
        let removeLastRegisteredModelConfigProvider = () => {};
        runtime.thread.subscribe(() => {
            const currentMessages = (runtime.thread.getState()).messages;
            const lastUserMessage = [...currentMessages].reverse().find(message => message.role === 'user');
            const allUserMessages = [...currentMessages].filter(message => message.role === 'user');
            removeLastRegisteredModelConfigProvider();
            const toolsToAdd = ToolRegistry.getAllTools().filter(tool => tool.unstable_tool.triggerCondition({
                lastUserMessage,
                allUserMessages
            }));

            removeLastRegisteredModelConfigProvider = runtime.registerModelConfigProvider({
                getModelConfig: () => {
                    const systemMsg = useSystemMessage(currentMessages, toolsToAdd);
                    return {
                        tools: convertUIToolsToDummyServerTools([...toolsToAdd]),
                        system: systemMsg
                    }
                }
            });
        });
        return () => {
            removeLastRegisteredModelConfigProvider();
        };
    }, [runtime]);
    return runtime.thread.getModelConfig();
}
