export const useSpeechToTextForComposer = (threadRuntime) => {
    const { useState, useEffect, useRef } = window.React;
    
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const confirmedTextRef = useRef('');
    const partialTextRef = useRef('');
    const baseComposerTextRef = useRef('');

    // Check microphone availability using VoskletSpeechToText
    useEffect(() => {
        const checkSupport = async () => {
            try {
                const availabilityResult = await window.appConnector.checkVoskletMicrophoneAvailability();
                setIsSupported(availabilityResult.isAvailable);
                if (!availabilityResult.isAvailable) {
                    console.warn('Microphone not available:', availabilityResult.message);
                }
            } catch (error) {
                console.warn('Failed to check microphone availability:', error);
                setIsSupported(false);
            }
        };

        checkSupport();

        return () => {
            if (isInitialized) {
                window.appConnector.stopVoskletRecording().catch(console.error);
                window.appConnector.cleanupVoskletSpeechToText().catch(console.error);
            }
        };
    }, [isInitialized]);

    // Message polling for Vosklet updates
    useEffect(() => {
        if (!isRecording) return;

        const pollForMessages = async () => {
            try {
                let updated = false;

                // Process final results first
                while (true) {
                    const resultMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-result');
                    if (!resultMessage) break;
                    if (typeof resultMessage.text === 'string') {
                        const chunk = resultMessage.text.trim();
                        if (chunk) {
                            confirmedTextRef.current = confirmedTextRef.current
                                ? `${confirmedTextRef.current} ${chunk}`
                                : chunk;
                            partialTextRef.current = '';
                            updated = true;
                        }
                    }
                }

                // Process partial results (get latest only)
                let latestPartial = null;
                while (true) {
                    const partialMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-partial');
                    if (partialMessage === null) break;
                    latestPartial = partialMessage;
                }
                if (latestPartial && typeof latestPartial.text === 'string') {
                    partialTextRef.current = latestPartial.text.trim();
                    updated = true;
                }

                // Check for errors
                const errorMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-error');
                if (errorMessage) {
                    console.error('Vosklet error:', errorMessage.error);
                    setIsRecording(false);
                    return;
                }

                // Update composer text if there are changes
                if (updated) {
                    const combined = [confirmedTextRef.current, partialTextRef.current]
                        .filter(Boolean)
                        .join(' ');
                    
                    if (combined) {
                        const newText = baseComposerTextRef.current 
                            ? `${baseComposerTextRef.current} ${combined}`
                            : combined;
                        threadRuntime.composer.setText(newText);
                    }
                }
            } catch (error) {
                console.error('Error polling for Vosklet messages:', error);
            }
        };

        const interval = setInterval(pollForMessages, 200);
        return () => clearInterval(interval);
    }, [isRecording, threadRuntime]);

    const flushVoskletMessages = async () => {
        try {
            const channels = ['vosklet-partial', 'vosklet-result', 'vosklet-error', 'vosklet-ready'];
            for (const channel of channels) {
                while (await window.appConnector.receiveMessageFromPlugin(channel) != null) {}
            }
        } catch (e) {
            console.warn('Failed to flush initial Vosklet messages', e);
        }
    };

    const cleanupExistingVosklet = async () => {
        try {
            await window.appConnector.stopVoskletRecording();
            await window.appConnector.cleanupVoskletSpeechToText();
        } catch (error) {
            console.warn('No existing Vosklet session to cleanup:', error);
        }
    };

    const toggleRecording = async () => {
        if (!isSupported) return;

        try {
            if (isRecording) {
                await window.appConnector.stopVoskletRecording();
                await window.appConnector.cleanupVoskletSpeechToText();
                setIsRecording(false);
                setIsInitialized(false);
                
                // Reset text refs
                confirmedTextRef.current = '';
                partialTextRef.current = '';
                baseComposerTextRef.current = '';
            } else {
                await cleanupExistingVosklet();

                const initResult = await window.appConnector.initializeVoskletSpeechToText();
                if (!initResult.success) {
                    console.error('Failed to initialize Vosklet:', initResult.error);
                    return;
                }

                const startResult = await window.appConnector.startVoskletRecording({
                    partialResult: 'vosklet-partial',
                    result: 'vosklet-result', 
                    error: 'vosklet-error',
                    ready: 'vosklet-ready'
                });

                if (!startResult.success) {
                    console.error('Failed to start recording:', startResult.error);
                    return;
                }

                // Store the existing composer text as base
                baseComposerTextRef.current = threadRuntime.composer.getState().text;
                
                setIsInitialized(true);
                setIsRecording(true);
                await flushVoskletMessages();
            }
        } catch (error) {
            console.error('Error toggling recording:', error);
            setIsRecording(false);
            setIsInitialized(false);
        }
    };

    return {
        isRecording,
        isSupported,
        toggleRecording
    };
};
