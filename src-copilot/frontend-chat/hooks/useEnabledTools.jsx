import { getChatThread, saveChatThread } from "../../CopilotDB/index.js";

export const useEnabledTools = (threadId, toolCategoryNames) => {
    const [enabledTools, setEnabledTools] = React.useState(new Set());

    // Load enabled tools from ChatHistoryDB on mount
    React.useEffect(() => {
        const loadEnabledTools = async () => {
            if (!threadId) return;
            
            try {
                const thread = await getChatThread(threadId);
                if (thread?.enabledTools) {
                    setEnabledTools(new Set(thread.enabledTools));
                } else {
                    // Default to all tools enabled for new threads
                    setEnabledTools(new Set(toolCategoryNames));
                }
            } catch (error) {
                console.error('Failed to load enabled tools:', error);
                // Default to all tools enabled on error
                setEnabledTools(new Set(toolCategoryNames));
            }
        };

        loadEnabledTools();
    }, [threadId, toolCategoryNames]);

    // Save enabled tools to ChatHistoryDB when they change
    const saveEnabledTools = React.useCallback(async (newEnabledTools) => {
        if (!threadId) return;
        
        try {
            const thread = await getChatThread(threadId);
            if (thread) {
                const updatedThread = {
                    ...thread,
                    enabledTools: Array.from(newEnabledTools),
                    updated: new Date().toISOString()
                };
                await saveChatThread(updatedThread);
            }
        } catch (error) {
            console.error('Failed to save enabled tools:', error);
        }
    }, [threadId]);

    const toggleTool = React.useCallback((toolName) => {
        setEnabledTools(prev => {
            const newSet = new Set(prev);
            if (newSet.has(toolName)) {
                newSet.delete(toolName);
            } else {
                newSet.add(toolName);
            }
            saveEnabledTools(newSet);
            return newSet;
        });
    }, [saveEnabledTools]);

    const isToolEnabled = React.useCallback((toolName) => {
        return enabledTools.has(toolName);
    }, [enabledTools]);

    return {
        enabledTools,
        toggleTool,
        isToolEnabled
    };
};