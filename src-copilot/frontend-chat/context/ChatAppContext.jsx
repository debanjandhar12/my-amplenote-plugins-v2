import {useToolRegistries} from "../hooks/useToolRegistries.js";

export const getChatAppContext = () => {
    if (!window.ChatAppContext) {
        window.ChatAppContext = React.createContext({});
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

    return (
        <ChatAppContext.Provider value={{ threadNewMsgComposerRef, setThreadNewMsgComposerRef,
            remoteThreadLoaded, setRemoteThreadLoaded,
            chatHistoryLoaded, setChatHistoryLoaded,
            isChatHistoryOverlayOpen, setIsChatHistoryOverlayOpen,
            toolCategoryNames, tools }}>
            {children}
        </ChatAppContext.Provider>
    );
};

