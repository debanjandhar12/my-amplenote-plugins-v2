import {useTributeSetup} from "./hooks/useTributeSetup.jsx";

// Based on: https://github.com/Yonom/assistant-ui/blob/main/packages/react/src/ui/composer.tsx
export const CustomComposer = () => {
    const allowAttachments = useAllowAttachments();
    const textareaRef = React.useRef(null);
    useTributeSetup(textareaRef, window.TOOL_CATEGORY_NAMES);    // setup tribute for autocomplete in composer.input
    return (
        <AssistantUI.Composer.Root>
            {allowAttachments &&
                <>
                    <AssistantUI.Composer.Attachments />
                    <AssistantUI.Composer.AddAttachment />
                </>}
            <AssistantUI.Composer.Input ref={textareaRef} />
            <AssistantUI.Composer.Send />
        </AssistantUI.Composer.Root>
    )
}

const useAllowAttachments = (ensureCapability = false) => {
    return AssistantUI.useThread((t) => t.capabilities.attachments);
}