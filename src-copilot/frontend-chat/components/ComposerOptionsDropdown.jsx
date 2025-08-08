import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { ToolGroupRegistry } from "../tools-core/registry/ToolGroupRegistry.js";
import { useEnabledTools } from "../hooks/useEnabledTools.jsx";

export const ComposerOptionsDropdown = () => {
    const { toolGroupNames } = React.useContext(getChatAppContext());
    const { toggleToolGroup, isToolGroupEnabled } = useEnabledTools();
    const [isOpen, setIsOpen] = React.useState(false);
    const composerRuntime = AssistantUI.useComposerRuntime();

    // Add defensive programming for context values

    // Inject styles using the same pattern as overwriteWithAmplenoteStyle
    React.useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.innerText = `
            /* Tool checkbox items with reduced padding */
            .composer-options-checkbox-item {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 4px 8px !important;
                border-radius: var(--radius-2) !important;
                color: var(--gray-12) !important;
                font-size: var(--font-size-2) !important;
                line-height: var(--line-height-2) !important;
                font-weight: var(--font-weight-regular) !important;
                user-select: none !important;
            }
            
            .composer-options-checkbox-item:hover {
                background-color: var(--accent-a3) !important;
            }

            .composer-options-item-indicator {
                width: 16px;
                height: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .composer-options-category-info {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex: 1;
            }

            .composer-options-category-info span {
                user-select: none !important;
            }

            .composer-options-info-icon {
                opacity: 0.6;
                cursor: help;
                transition: opacity 0.2s;
                margin-left: auto;
                flex-shrink: 0;
            }

            .composer-options-info-icon:hover {
                opacity: 1;
            }

            /* Fix tooltip z-index and enable HTML rendering */
            [data-radix-tooltip-content] {
                z-index: 50000 !important;
            }

            /* Fix button alignment */
            .aui-composer-add-attachment {
                align-self: center !important;
            }

            /* Tools header styling */
            .composer-options-tools-header {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 6px 8px !important;
                color: var(--gray-11) !important;
                font-size: var(--font-size-1) !important;
                font-weight: var(--font-weight-medium) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
            }

            /* Improve dropdown content styling */
            [data-radix-dropdown-menu-content] {
                min-width: 200px !important;
                padding: 4px !important;
            }
        `.replace(/\s+/g, ' ').trim();
        document.body.appendChild(styleEl);

        return () => {
            if (document.body.contains(styleEl)) {
                document.body.removeChild(styleEl);
            }
        };
    }, []);

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

    const handleAddNote = React.useCallback(async () => {
        try {
            const selectedNote = await window.appConnector.prompt("", {
                inputs: [
                    { label: "Select note to add to chat", type: "note" }
                ]
            });

            if (!selectedNote) return;

            // Get note details
            const selectedNoteUUID = selectedNote.uuid;
            const noteContent = await window.appConnector.getNoteContentByUUID(selectedNoteUUID);
            if (!noteContent) return;

            // Send note attachment message similar to how Add note to chat works in plugin.js
            await window.appConnector.sendMessageToEmbed('attachments',
                { type: 'note', noteUUID: selectedNoteUUID, noteTitle: selectedNote.name, noteContent: noteContent });

            setIsOpen(false);
        } catch (error) {
            console.error('Error adding note:', error);
            setIsOpen(false);
        }
    }, []);

    const { DropdownMenu, Checkbox, Tooltip, Button } = window.RadixUI;
    const { InfoCircledIcon, PlusIcon, UploadIcon, FilePlusIcon, ChevronRightIcon, MixerHorizontalIcon } = window.RadixIcons;

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <Button
                    variant="ghost"
                    size="2"
                    className="aui-composer-add-attachment"
                    style={{
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        margin: '0'
                    }}
                >
                    <PlusIcon width="16" height="16" />
                </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content side={'top'}>
                <DropdownMenu.Label className="composer-options-tools-header">
                    <MixerHorizontalIcon width="12" height="12" />
                    Tool Groups
                </DropdownMenu.Label>

                {toolGroupNames.map((toolName) => (
                    <div
                        key={toolName}
                        className="composer-options-checkbox-item"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleToolGroup(toolName);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="composer-options-item-indicator">
                            <Checkbox
                                checked={isToolGroupEnabled(toolName)}
                                size="1"
                            />
                        </div>
                        <div className="composer-options-category-info">
                            <span>{toolName}</span>
                            <Tooltip content={
                                <div dangerouslySetInnerHTML={{ __html: ToolGroupRegistry.getGroup(toolName)?.description }} />
                            }>
                                <InfoCircledIcon
                                    className="composer-options-info-icon"
                                    width="14"
                                    height="14"
                                />
                            </Tooltip>
                        </div>
                    </div>
                ))}

                <DropdownMenu.Separator />

                <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                        <PlusIcon width="16" height="16" />
                        Add context
                    </DropdownMenu.SubTrigger>

                    <DropdownMenu.SubContent>
                        <DropdownMenu.Item onSelect={handleFileUpload}>
                            <UploadIcon width="16" height="16" />
                            Upload attachments
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onSelect={handleAddNote}>
                            <FilePlusIcon width="16" height="16" />
                            Add note to chat
                        </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};