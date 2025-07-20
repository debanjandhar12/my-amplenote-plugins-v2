import { useEnabledTools } from "../hooks/useEnabledTools.jsx";
import { getChatAppContext } from "./ChatAppContext.jsx";

export const getEnabledToolsContext = () => {
    if (!window.EnabledToolsContext) {
        window.EnabledToolsContext = React.createContext({
            enabledTools: new Set(),
            toggleTool: () => { },
            isToolEnabled: () => true
        });
    }
    return window.EnabledToolsContext;
}

export const EnabledToolsContextProvider = ({ children }) => {
    const EnabledToolsContext = getEnabledToolsContext();
    const chatAppContext = React.useContext(getChatAppContext());
    const { toolCategoryNames } = chatAppContext || {};

    // Add error handling for thread runtime
    let threadId = null;
    try {
        const threadRuntime = AssistantUI.useThreadRuntime();
        threadId = threadRuntime.getState().threadId;
    } catch (error) {
        console.warn('Thread runtime not available:', error);
    }

    const { enabledTools, toggleTool, isToolEnabled } = useEnabledTools(threadId, toolCategoryNames || []);

    return (
        <EnabledToolsContext.Provider value={{ enabledTools, toggleTool, isToolEnabled }}>
            {children}
        </EnabledToolsContext.Provider>
    );
};