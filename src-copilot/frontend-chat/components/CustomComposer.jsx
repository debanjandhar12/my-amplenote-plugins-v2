import {useTributeSetup} from "../hooks/useTributeSetup.jsx";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {getChatAppContext} from "../context/ChatAppContext.jsx";
import {FileAttachmentDisplay} from "./FileAttachmentDisplay.jsx";

// Based on: https://github.com/Yonom/assistant-ui/blob/main/packages/react/src/ui/composer.tsx
export const CustomComposer = () => {
    const allowAttachments = useAllowAttachments();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const textareaRef = React.useRef(null);
    const isLLMCallRunning = AssistantUI.useThread((thread) => thread.isRunning);
    const isToolCallRunning = AssistantUI.useThread((thread) => {
        if (thread.messages.length > 0) {
            const lastMsg = thread.messages[thread.messages.length - 1];
            return lastMsg?.status?.type === 'requires-action';
        }
    });
    const isRunning = isLLMCallRunning || isToolCallRunning;

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

    const {Composer} = window.AssistantUI;
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
            {!isRunning &&
                <Composer.Send />
            }
            {isRunning &&
                // Could have used Composer.Cancel but for future change to onclick event, it was not used
                <button disabled={isToolCallRunning} className="aui-button aui-button-primary aui-button-icon aui-composer-cancel" type="button"
                        onClick={() => {
                            // TODO: Cancel all tool calls above the cancelRun line and also remove the disabled attribute
                            threadRuntime.cancelRun()
                        }}
                        data-state="closed">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16"
                         height="16">
                        <rect width="10" height="10" x="3" y="3" rx="2"></rect>
                    </svg>
                    <span className="aui-sr-only">Cancel</span>
                </button>
            }
        </Composer.Root>
    )
}

const useAllowAttachments = () => {
    const threadRuntime = AssistantUI.useThreadRuntime();
    return threadRuntime.getState().capabilities.attachments;
}