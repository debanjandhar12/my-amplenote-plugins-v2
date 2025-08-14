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
    const [initialAttachmentProcessed, setInitialAttachmentProcessed] = React.useState(false);
    const { toolGroupNames, tools } = useToolRegistries();
    const [enabledToolGroups, setEnabledToolGroups] = React.useState(new Set());

    return (
        <ChatAppContext.Provider value={{ threadNewMsgComposerRef, setThreadNewMsgComposerRef,
            remoteThreadLoaded, setRemoteThreadLoaded,
            chatHistoryLoaded, setChatHistoryLoaded,
            isChatHistoryOverlayOpen, setIsChatHistoryOverlayOpen,
            initialAttachmentProcessed, setInitialAttachmentProcessed,
            toolGroupNames, tools, enabledToolGroups, setEnabledToolGroups }}>
            {children}
        </ChatAppContext.Provider>
    );
};

