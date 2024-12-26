
export const FileAttachmentDisplay = (args) => {
    const canRemove = AssistantUI.useAttachment((a) => a.source !== "message");
    const attachmentFile = AssistantUI.useAttachment((a) => a.file);
    const { FileIcon, FileTextIcon, CheckboxIcon, CursorTextIcon } = window.RadixIcons;
    let fileTypeName = null;
    let fileIcon = null;
    switch (attachmentFile.type) {
        case "text/amplenote-task":
            fileTypeName = "Amplenote Task";
            fileIcon = <CheckboxIcon />;
            break;
        case "text/amplenote-note":
            fileTypeName = "Amplenote Note";
            fileIcon = <FileTextIcon />;
            break;
        case "text/amplenote-selection":
            fileTypeName = "Current Selection";
            fileIcon = <CursorTextIcon />;
            break;
        default:
            fileTypeName = 'File';
            fileIcon = <FileIcon />;
            break;
    }
    const { AttachmentUI, AttachmentPrimitive } = window.AssistantUI;
    return (
        <AttachmentUI.Root>
            <span className="aui-avatar-root aui-attachment-thumb">
                <span>
                    {fileIcon}
                </span>
            </span>
            <div className="aui-attachment-text">
                <p className="aui-attachment-name">
                    <AttachmentPrimitive.Name/>
                </p>
                <p className="aui-attachment-type">{fileTypeName}</p>
            </div>
                {canRemove && <AttachmentUI.Remove/>}
        </AttachmentUI.Root>
    );
};