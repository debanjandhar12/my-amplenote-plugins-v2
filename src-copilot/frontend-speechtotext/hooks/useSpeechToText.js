export const useSpeechToText = () => {
    const { useState, useEffect, useRef } = window.React;
    
    const [status, setStatus] = useState('initializing');
    const [errorObj, setErrorObj] = useState(null);
    const [transcriptionText, setTranscriptionText] = useState('');
    const confirmedTextRef = useRef('');
    const partialTextRef = useRef('');

    const resetTranscription = () => {
        setTranscriptionText('');
        confirmedTextRef.current = '';
        partialTextRef.current = '';
    };

    const setError = (message, type = 'UNKNOWN_ERROR') => {
        setStatus('error');
        setErrorObj({ message, type });
    };

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

    const initializeVosklet = async () => {
        try {
            await cleanupExistingVosklet();

            const initResult = await window.appConnector.initializeVoskletSpeechToText();
            if (!initResult.success) {
                setError(initResult.error, initResult.errorType);
                return;
            }

            const startResult = await window.appConnector.startVoskletRecording({
                partialResult: 'vosklet-partial',
                result: 'vosklet-result', 
                error: 'vosklet-error',
                ready: 'vosklet-ready'
            });

            if (!startResult.success) {
                setError(startResult.error, startResult.errorType);
                return;
            }

            setStatus('processing');
            await flushVoskletMessages();
        } catch (error) {
            console.error('Failed to initialize Vosklet speech-to-text:', error);
            setError(error.message || 'Unknown error', 'INITIALIZATION_ERROR');
        }
    };

    const stopRecording = async () => {
        try {
            await window.appConnector.stopVoskletRecording();
            await window.appConnector.cleanupVoskletSpeechToText();
            setStatus('stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
            setError(error.message || 'Failed to stop recording', 'STOP_ERROR');
        }
    };

    const startNewRecording = async () => {
        resetTranscription();
        setStatus('initializing');
        setErrorObj(null);
        await initializeVosklet();
    };

    // Initialize on mount
    useEffect(() => {
        initializeVosklet();
    }, []);

    // Polling loop for messages
    useEffect(() => {
        const pollForMessages = async () => {
            if (status !== 'processing') return;

            try {
                let updated = false;

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

                const errorMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-error');
                if (errorMessage) {
                    setError(errorMessage.error, errorMessage.errorType);
                    return;
                }

                if (updated) {
                    const combined = [confirmedTextRef.current, partialTextRef.current]
                        .filter(Boolean)
                        .join(' ');
                    setTranscriptionText(combined);
                }
            } catch (error) {
                console.error('Error polling for Vosklet messages:', error);
            }
        };

        const interval = setInterval(pollForMessages, 200);
        return () => clearInterval(interval);
    }, [status]);

    return {
        status,
        errorObj,
        transcriptionText,
        setTranscriptionText,
        resetTranscription,
        stopRecording,
        startNewRecording
    };
};
