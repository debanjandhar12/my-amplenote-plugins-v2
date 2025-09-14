export const VoiceToTextButton = () => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(false);
    const recognitionRef = React.useRef(null);
    const threadRuntime = AssistantUI.useThreadRuntime();
    const composerText = AssistantUI.useComposer((composer) => composer.text);
    const hasComposerText = composerText.trim().length > 0;
    const isLLMCallRunning = AssistantUI.useThread((thread) => thread.isRunning);
    const isToolCallRunning = AssistantUI.useThread((thread) => {
        if (thread.messages.length > 0) {
            const lastMsg = thread.messages[thread.messages.length - 1];
            return lastMsg?.status?.type === 'requires-action';
        }
    });

    // Determine which button to show (same logic as parent component)
    const isRunning = isLLMCallRunning || isToolCallRunning;
    const showSendButton = !isRunning || (isToolCallRunning && hasComposerText);

    // Check browser support for Speech Recognition
    React.useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
            
            // Configure recognition
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            // Handle results
            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    // Append to existing composer text
                    const currentText = threadRuntime.composer.getState().text;
                    const newText = currentText ? `${currentText} ${finalTranscript}` : finalTranscript;
                    threadRuntime.composer.setText(newText);
                }
            };

            // Handle errors
            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            // Handle end
            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [threadRuntime]);

    const toggleRecording = () => {
        if (!isSupported || !recognitionRef.current) return;

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
            }
        }
    };

    // Don't render if not supported
    if (!isSupported) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={toggleRecording}
            className="aui-button aui-button-icon"
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            style={{
                padding: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                minHeight: '32px',
                transition: 'all 0.2s ease',
                color: isRecording ? '#ef4444' : 'var(--aui-muted-foreground)',
                opacity: isRecording ? 1 : 0.7,
                position: 'absolute',
                right: showSendButton ? '48px' : '8px',
                top: '50%',
                transform: 'translateY(-50%)'
            }}
            onMouseEnter={(e) => {
                if (!isRecording) {
                    e.target.style.opacity = '1';
                }
            }}
            onMouseLeave={(e) => {
                if (!isRecording) {
                    e.target.style.opacity = '0.7';
                }
            }}
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                width="14" 
                height="14"
                style={{
                    animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}
            >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2a1 1 0 0 1 2 0v2a5 5 0 0 0 10 0v-2a1 1 0 0 1 2 0z"/>
                <path d="M13 21h-2a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2z"/>
            </svg>
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            `}</style>
        </button>
    );
};