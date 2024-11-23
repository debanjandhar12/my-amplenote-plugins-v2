import {useTributeSetup} from "./hooks/useTributeSetup.jsx";

// Based on: https://github.com/Yonom/assistant-ui/blob/main/packages/react/src/ui/composer.tsx
export const CustomComposer = () => {
    const allowAttachments = useAllowAttachments();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const textareaRef = React.useRef(null);
    useTributeSetup(textareaRef, window.TOOL_CATEGORY_NAMES);    // setup tribute for autocomplete in composer.input

    // Fix: Enter not working in amplenote
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.addEventListener('keydown', (e) => {
                const isTributeDisplayed = document.querySelector('.tribute-container');
                if (e.key === 'Enter' && !e.shiftKey && !isTributeDisplayed
                    && threadRuntime.composer.getState().text.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    threadRuntime.composer.send();
                }
            });
        }
    }, [threadRuntime, textareaRef]);

    const {Composer} = window.AssistantUI;
    return (
        <Composer.Root>
            {allowAttachments &&
                <>
                    <Composer.Attachments />
                    <Composer.AddAttachment />
                </>}
            <Composer.Input ref={textareaRef} />
            <Composer.Send />
        </Composer.Root>
    )
}

const useAllowAttachments = (ensureCapability = false) => {
    return AssistantUI.useThread((t) => t.capabilities.attachments);
}