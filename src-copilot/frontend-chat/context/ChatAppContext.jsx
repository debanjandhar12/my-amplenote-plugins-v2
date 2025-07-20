import {useToolRegistries} from "../hooks/useToolRegistries.js";
import {useEnabledTools} from "../hooks/useEnabledTools.jsx";

export const getChatAppContext = () => {
    if (!window.ChatAppContext) {
        window.ChatAppContext = React.createContext({
            enabledTools: new Set(),
            toggleTool: () => {},
            isToolEnabled: () => false // Default to no tools enabled
        });
    }
    return window.ChatAppContext;
}

export const ChatAppContextProvider = ({ children }) => {
    const ChatAppContext = getChatAppContext();

    const [threadNewMsgComposerRef, setThreadNewMsgComposerRef] = React.useState(null);
    const [remoteThreadLoaded, setRemoteThreadLoaded] = React.useState(false);
    const [chatHistoryLoaded, setChatHistoryLoaded] = React.useState(false);
    const [isChatHistoryOverlayOpen, setIsChatHistoryOverlayOpen] = React.useState(false);
    
    const { toolCategoryNames, tools } = useToolRegistries();

    // Get thread ID safely - this will be null if AssistantUI context is not available
    let threadId = null;
    try {
        const threadRuntime = AssistantUI.useThreadRuntime();
        threadId = threadRuntime.getState().threadId;
    } catch (error) {
        // AssistantUI context not available, threadId remains null
    }

    const { enabledTools, toggleTool, isToolEnabled } = useEnabledTools(threadId, toolCategoryNames || []);

    return (
        <ChatAppContext.Provider value={{ threadNewMsgComposerRef, setThreadNewMsgComposerRef,
            remoteThreadLoaded, setRemoteThreadLoaded,
            chatHistoryLoaded, setChatHistoryLoaded,
            isChatHistoryOverlayOpen, setIsChatHistoryOverlayOpen,
            toolCategoryNames, tools, enabledTools, toggleTool, isToolEnabled }}>
            {children}
        </ChatAppContext.Provider>
    );
};

