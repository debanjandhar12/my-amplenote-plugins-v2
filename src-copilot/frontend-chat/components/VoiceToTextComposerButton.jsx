export const VoiceToTextComposerButton = () => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(false);
    const [isInitialized, setIsInitialized] = React.useState(false);
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

    // Check browser support and initialize Vosklet
    React.useEffect(() => {
        const checkSupport = async () => {
            // Check for required browser APIs
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioContext) {
                setIsSupported(false);
                return;
            }

            try {
                // Initialize Vosklet API
                const result = await window.appConnector.initializeVoskletSpeechToText();
                if (result.success) {
                    setIsSupported(true);
                    setIsInitialized(true);
                } else {
                    console.error('Failed to initialize Vosklet:', result.error);
                    setIsSupported(false);
                }
            } catch (error) {
                console.error('Error checking Vosklet support:', error);
                setIsSupported(false);
            }
        };

        checkSupport();

        // Setup message listener for Vosklet callbacks
        const handleMessage = (event) => {
            if (event.data?.type === 'voskletCallback') {
                const { callbackType, data } = event.data;
                
                switch (callbackType) {
                    case 'onPartialResult':
                        // Handle partial results (could show interim text)
                        break;
                    case 'onResult':
                        // Append final result to existing composer text
                        if (data?.text) {
                            const currentText = threadRuntime.composer.getState().text;
                            const newText = currentText ? `${currentText} ${data.text}` : data.text;
                            threadRuntime.composer.setText(newText);
                        }
                        break;
                    case 'onError':
                        console.error('Vosklet error:', data);
                        setIsRecording(false);
                        break;
                    case 'onReady':
                        // Recording is ready
                        break;
                }
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
            // Cleanup Vosklet on unmount
            if (isInitialized) {
                window.appConnector.onEmbedCall('cleanupVoskletSpeechToText').catch(console.error);
            }
        };
    }, [threadRuntime, isInitialized]);

    const toggleRecording = async () => {
        if (!isSupported || !isInitialized) return;

        try {
            if (isRecording) {
                const result = await window.appConnector.onEmbedCall('stopVoskletRecording');
                if (result.success) {
                    setIsRecording(false);
                } else {
                    console.error('Failed to stop recording:', result.error);
                }
            } else {
                // Setup callback channels for message queue communication
                const callbackChannels = {
                    onPartialResult: 'voskletCallback',
                    onResult: 'voskletCallback',
                    onError: 'voskletCallback',
                    onReady: 'voskletCallback'
                };

                const result = await window.appConnector.onEmbedCall('startVoskletRecording', callbackChannels);
                if (result.success) {
                    setIsRecording(true);
                } else {
                    console.error('Failed to start recording:', result.error);
                }
            }
        } catch (error) {
            console.error('Error toggling recording:', error);
            setIsRecording(false);
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
            title="Dictate"
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