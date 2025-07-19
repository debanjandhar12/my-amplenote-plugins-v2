import {useTributeSetup} from "../hooks/useTributeSetup.jsx";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";
import {FileAttachmentDisplay} from "./FileAttachmentDisplay.jsx";

// Based on: https://github.com/Yonom/assistant-ui/blob/main/packages/react/src/ui/composer.tsx
export const CustomComposer = () => {
    const allowAttachments = useAllowAttachments();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const textareaRef = React.useRef(null);

    // Consume registry status from context
    const { toolCategoryNames } = React.useContext(getChatAppContext());

    // Pass the state to the hook
    useTributeSetup(textareaRef, toolCategoryNames);

    // Fix: Enter not working in amplenote
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.addEventListener('keydown', (e) => {
                let isTributeDisplayed = document.querySelector('.tribute-container');
                isTributeDisplayed = isTributeDisplayed && isTributeDisplayed.style.display !== 'none';
                if (e.key === 'Enter' && !e.shiftKey && !isTributeDisplayed
                    && threadRuntime.composer.getState().text.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    threadRuntime.composer.send();
                }
            });
        }
    }, [threadRuntime, textareaRef]);

    // Pass textareaRef to ChatAppContext
    const {setThreadNewMsgComposerRef} = React.useContext(getChatAppContext());
    React.useEffect(() => {
        setThreadNewMsgComposerRef(textareaRef);
    }, [textareaRef, setThreadNewMsgComposerRef]);

    const {ThreadPrimitive, Composer} = window.AssistantUI;
    return (
        <Composer.Root>
            {allowAttachments &&
                <>
                    <Composer.Attachments
                        components={{
                            File: FileAttachmentDisplay
                        }} />
                    <Composer.AddAttachment />
                </>}
            <Composer.Input ref={textareaRef} />
            <ThreadPrimitive.If running={false}>
                <Composer.Send />
            </ThreadPrimitive.If>
            <ThreadPrimitive.If running>
                <Composer.Cancel />
            </ThreadPrimitive.If>
        </Composer.Root>
    )
}

const useAllowAttachments = () => {
    const threadRuntime = AssistantUI.useThreadRuntime();
    return threadRuntime.getState().capabilities.attachments;
}