import { getChatAppContext } from "../context/ChatAppContext.jsx";

export const useEnabledTools = () => {
    const { enabledToolGroups, setEnabledToolGroups, lastLoadedChatHistoryThreadId } = React.useContext(getChatAppContext());
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();

    // Save enabled tools to ChatHistoryDB when they change
    const saveEnabledToolGroups = React.useCallback(async (threadId, newEnabledToolGroupsSet) => {
        try {
            const thread = await appConnector.getChatThreadFromCopilotDB(threadId);
            if (thread) {
                const updatedThread = {
                    ...thread,
                    enabledToolGroups: [...newEnabledToolGroupsSet] // db needs array
                };
                await appConnector.saveChatThreadToCopilotDB(updatedThread);
            }
        } catch (error) {
            console.error('Failed to save enabled tools:', error);
        }
    }, []);

    // Automatically load enabled tools when thread changes
    React.useEffect(() => {
        const loadEnabledToolGroupsFromDB = async (threadId) => {
            if (!threadId) return;
            
            // Don't reload if this is the same thread
            if (lastLoadedChatHistoryThreadId.current === threadId) {
                console.log('Skipping reload for same thread:', threadId);
                return;
            }

            console.log('Loading enabled tools for thread:', threadId, 'lastLoaded:', lastLoadedChatHistoryThreadId.current);

            try {
                const thread = await appConnector.getChatThreadFromCopilotDB(threadId);
                if (thread?.enabledToolGroups) {
                    setEnabledToolGroups(new Set(thread.enabledToolGroups));
                } else {
                    setEnabledToolGroups(new Set());
                }
            } catch (error) {
                setEnabledToolGroups(new Set());
            } finally {
                lastLoadedChatHistoryThreadId.current = threadId;
                console.log('Set lastLoadedChatHistoryThreadId to:', threadId);
            }
        };

        const loadEnabledToolsForCurrentThread = async () => {
            const threadId = threadListItemRuntime.getState().remoteId;
            await loadEnabledToolGroupsFromDB(threadId);
        };

        const unsubscribe = threadListItemRuntime.subscribe(loadEnabledToolsForCurrentThread);

        // Load for current thread on mount
        loadEnabledToolsForCurrentThread();

        return () => unsubscribe();
    }, [threadListItemRuntime]);

    // Util function to toggle a tool group enabled state
    const toggleToolGroup = React.useCallback(async (toolGroup) => {
        const threadId = threadListItemRuntime.getState().remoteId;
        setEnabledToolGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(toolGroup)) {
                newSet.delete(toolGroup);
            } else {
                newSet.add(toolGroup);
            }
            saveEnabledToolGroups(threadId, newSet);
            return newSet;
        });
    }, [setEnabledToolGroups, saveEnabledToolGroups, threadListItemRuntime]);

    // Util function to enable a tool group
    const enableToolGroup = React.useCallback(async (toolGroup) => {
        const threadId = threadListItemRuntime.getState().remoteId;
        setEnabledToolGroups(prev => {
            const newSet = new Set(prev);
            newSet.add(toolGroup);
            saveEnabledToolGroups(threadId, newSet);
            return newSet;
        });
    }, [setEnabledToolGroups, saveEnabledToolGroups, threadListItemRuntime]);

    const isToolGroupEnabled = React.useCallback((toolGroup) => {
        return enabledToolGroups.has(toolGroup);
    }, [enabledToolGroups]);

    return {
        toggleToolGroup,
        enableToolGroup,
        isToolGroupEnabled
    };
};