export const getChatAppContext = () => {
    if (!window.ChatAppContext) {
        window.ChatAppContext = React.createContext({});
    }
    return window.ChatAppContext;
}
export const ChatAppContextProvider = ({ children }) => {
    const ChatAppContext = getChatAppContext();

    const [threadNewMsgComposerRef, setThreadNewMsgComposerRef] = React.useState(null);

    return (
        <ChatAppContext.Provider value={{ threadNewMsgComposerRef, setThreadNewMsgComposerRef }}>
            {children}
        </ChatAppContext.Provider>
    );
};

