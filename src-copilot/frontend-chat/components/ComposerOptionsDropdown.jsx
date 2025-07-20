import { getChatAppContext } from "../context/ChatAppContext.jsx";
import "./ComposerOptionsDropdown.css";

export const ComposerOptionsDropdown = () => {
    const chatAppContext = React.useContext(getChatAppContext());
    const [isOpen, setIsOpen] = React.useState(false);
    const composerRuntime = AssistantUI.useComposerRuntime();
    
    // Add defensive programming for context values
    const { toolCategoryNames, enabledTools, toggleTool, isToolEnabled } = chatAppContext || {};
    const safeToggleTool = typeof toggleTool === 'function' ? toggleTool : () => {};
    const safeIsToolEnabled = typeof isToolEnabled === 'function' ? isToolEnabled : () => false;

    const handleFileUpload = React.useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.hidden = true;
        
        const attachmentAccept = composerRuntime.getAttachmentAccept();
        if (attachmentAccept !== "*") {
            input.accept = attachmentAccept;
        }
        
        document.body.appendChild(input);
        
        input.onchange = (e) => {
            const fileList = e.target.files;
            if (!fileList) return;
            
            for (const file of fileList) {
                composerRuntime.addAttachment(file);
            }
            document.body.removeChild(input);
        };
        
        input.oncancel = () => {
            if (!input.files || input.files.length === 0) {
                document.body.removeChild(input);
            }
        };
        
        input.click();
        setIsOpen(false);
    }, [composerRuntime]);

    const { DropdownMenu } = window.RadixUI;
    const { CheckIcon } = window.RadixIcons;

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <button 
                    className="aui-button aui-button-primary aui-button-icon aui-composer-add-attachment" 
                    type="button"
                    data-state={isOpen ? "open" : "closed"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" clipRule="evenodd"></path>
                    </svg>
                    <span className="aui-sr-only">Add attachment or select tools</span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content 
                className="tool-selection-dropdown-content"
                sideOffset={5}
                align="start"
            >
                <DropdownMenu.Label className="tool-selection-dropdown-label">
                    Tools
                </DropdownMenu.Label>
                
                <DropdownMenu.Separator />
                
                {toolCategoryNames.map((toolName) => (
                    <DropdownMenu.Item
                        key={toolName}
                        className="tool-selection-dropdown-checkbox-item"
                        onSelect={() => safeToggleTool(toolName)}
                    >
                        <div className="tool-selection-dropdown-item-indicator">
                            {safeIsToolEnabled(toolName) && <CheckIcon width="12" height="12" />}
                        </div>
                        {toolName}
                    </DropdownMenu.Item>
                ))}
                
                <DropdownMenu.Separator />
                
                <DropdownMenu.Item 
                    className="tool-selection-dropdown-item"
                    onSelect={handleFileUpload}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                        <path d="M8.5 1.5A1.5 1.5 0 0 0 7 3v.5h2V3a1.5 1.5 0 0 0-1.5-1.5Z"></path>
                        <path fillRule="evenodd" d="M6 4.5V3a3 3 0 1 1 6 0v1.5h.5A1.5 1.5 0 0 1 14 6v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13V6a1.5 1.5 0 0 1 1.5-1.5H6ZM3.5 6a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-9Z" clipRule="evenodd"></path>
                    </svg>
                    Upload attachments
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};