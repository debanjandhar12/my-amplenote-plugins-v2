import { useTributeSetup } from "../hooks/useTributeSetup.jsx";
import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { FileAttachmentDisplay } from "./FileAttachmentDisplay.jsx";
import { ComposerOptionsDropdown } from "./ComposerOptionsDropdown.jsx";

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
    const composerText = AssistantUI.useComposer((composer) => composer.text);
    const hasComposerText = composerText.trim().length > 0;

    const { toolGroupNames, chatHistoryLoaded } = React.useContext(getChatAppContext());

    // Pass the state to the hook
    useTributeSetup(textareaRef, toolGroupNames);

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

    // Set focus on textarea when chat history is loaded (thread switch completed)
    React.useEffect(() => {
        if (chatHistoryLoaded && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [chatHistoryLoaded]);

    // Pass textareaRef to ChatAppContext
    const { setThreadNewMsgComposerRef } = React.useContext(getChatAppContext());
    React.useEffect(() => {
        setThreadNewMsgComposerRef(textareaRef);
    }, [textareaRef, setThreadNewMsgComposerRef]);

    // Determine which button to show
    const isRunning = isLLMCallRunning || isToolCallRunning;
    const showSendButton = !isRunning || (isToolCallRunning && hasComposerText);
    const showCancelButton = !showSendButton;

    const { Composer } = window.AssistantUI;
    return (
        <Composer.Root>
            {allowAttachments &&
                <>
                    <Composer.Attachments
                        components={{
                            File: FileAttachmentDisplay
                        }} />
                    <ComposerOptionsDropdown />
                </>}
            <Composer.Input ref={textareaRef} />

            {showSendButton && <Composer.Send />}

            {showCancelButton &&
                <button
                    disabled={isToolCallRunning}
                    className="aui-button aui-button-primary aui-button-icon aui-composer-cancel"
                    type="button"
                    onClick={() => threadRuntime.cancelRun()}
                    data-state="closed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
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