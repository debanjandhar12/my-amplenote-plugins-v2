import { getChatThread, saveChatThread } from "../../CopilotDB/index.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const useEnabledTools = () => {
    const {enabledToolGroups, setEnabledToolGroups } = React.useContext(getChatAppContext());
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();

    // Get current thread ID
    const getCurrentThreadId = React.useCallback(() => {
        return threadListItemRuntime.getState().remoteId;
    }, [threadListItemRuntime]);

    // Load enabled tools from ChatHistoryDB on mount
    const loadEnabledToolGroupsFromDB = React.useCallback(async (threadId) => {
        if (!threadId) return;

        try {
            const thread = await getChatThread(threadId);
            if (thread?.enabledToolGroups) {
                setEnabledToolGroups(new Set(thread.enabledToolGroups));
            } else {
                setEnabledToolGroups(new Set());
            }
        } catch (error) {
            setEnabledToolGroups(new Set());
        }
    }, [setEnabledToolGroups]);

    // Save enabled tools to ChatHistoryDB when they change
    const saveEnabledToolGroups = React.useCallback(async (threadId, newEnabledToolGroups) => {
        try {
            const thread = await getChatThread(threadId);
            if (thread) {
                const updatedThread = {
                    ...thread,
                    enabledToolGroups: Array.from(newEnabledToolGroups),
                    updated: new Date().toISOString()
                };
                await saveChatThread(updatedThread);
            }
        } catch (error) {
            console.error('Failed to save enabled tools:', error);
        }
    }, []);

    // Automatically load enabled tools when thread changes
    React.useEffect(() => {
        const loadEnabledToolsForCurrentThread = async () => {
            const threadId = getCurrentThreadId();
            await loadEnabledToolGroupsFromDB(threadId);
        };

        const unsubscribe = threadListItemRuntime.subscribe(loadEnabledToolsForCurrentThread);

        // Load for current thread on mount
        loadEnabledToolsForCurrentThread();

        return () => unsubscribe();
    }, [threadListItemRuntime, getCurrentThreadId, loadEnabledToolGroupsFromDB]);

    // Util function to toggle a tool group enabled state
    const toggleToolGroup = React.useCallback(async (toolGroup) => {
        const threadId = getCurrentThreadId();
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
    }, [setEnabledToolGroups, saveEnabledToolGroups, getCurrentThreadId]);

    // Util function to enable a tool group
    const enableToolGroup = React.useCallback(async (toolGroup) => {
        const threadId = getCurrentThreadId();
        setEnabledToolGroups(prev => {
            const newSet = new Set(prev);
            newSet.add(toolGroup);
            saveEnabledToolGroups(threadId, newSet);
            return newSet;
        });
    }, [setEnabledToolGroups, saveEnabledToolGroups, getCurrentThreadId]);

    const isToolGroupEnabled = React.useCallback((toolGroup) => {
        return enabledToolGroups.has(toolGroup);
    }, [enabledToolGroups]);

    return {
        toggleToolGroup,
        enableToolGroup,
        isToolGroupEnabled
    };
};