export const useTributeSetup = (textareaRef, toolCategoryNames) => {
    // Tribute functionality is now disabled since we're using GUI-based tool selection
    // This hook is kept for backward compatibility but does nothing
    React.useEffect(() => {
        // No-op: tribute functionality replaced by ToolSelectionDropdown
    }, [textareaRef, toolCategoryNames]);
}