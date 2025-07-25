import { getChatThread, saveChatThread } from "../../CopilotDB/index.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const useEnabledTools = () => {
    const {enabledToolGroups, setEnabledToolGroups } = React.useContext(getChatAppContext());

    // Load enabled tools from ChatHistoryDB on mount
    const loadEnabledToolGroupsFromDB = React.useCallback(async (threadId) => {
        if (!threadId) return;

        try {
            const thread = await getChatThread(threadId);
            if (thread?.enabledToolGroups) {
                setEnabledToolGroups(new Set(thread.enabledToolGroups));
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

    // Util function to toggle a tool group enabled state
    const toggleToolGroup = React.useCallback(async (toolGroup) => {
        setEnabledToolGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(toolGroup)) {
                newSet.delete(toolGroup);
            } else {
                newSet.add(toolGroup);
            }
            saveEnabledToolGroups(newSet);
            return newSet;
        });
    }, [setEnabledToolGroups, saveEnabledToolGroups]);

    // Util function to enable a tool group
    const enableToolGroup = React.useCallback(async (toolGroup) => {
        setEnabledToolGroups(prev => {
            const newSet = new Set(prev);
            newSet.add(toolGroup);
            saveEnabledToolGroups(newSet);
            return newSet;
        });
    }, [setEnabledToolGroups, saveEnabledToolGroups]);

    const isToolGroupEnabled = React.useCallback((toolGroup) => {
        return enabledToolGroups.has(toolGroup);
    }, [enabledToolGroups]);

    return {
        loadEnabledToolGroupsFromDB,
        toggleToolGroup,
        enableToolGroup,
        isToolGroupEnabled
    };
};