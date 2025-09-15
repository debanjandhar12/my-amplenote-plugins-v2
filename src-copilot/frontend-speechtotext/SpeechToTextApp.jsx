import {useIntervalPingPlugin} from "../frontend-chat/hooks/useIntervalPingPlugin.jsx";
import {errorToString} from "../frontend-chat/helpers/errorToString.js";

export const SpeechToTextApp = () => {
    const { useState, useEffect, useRef } = window.React;
    const [status, setStatus] = useState('initializing'); // 'initializing', 'processing', 'stopped', 'error'
    const [errorObj, setErrorObj] = useState(null);
    const [transcriptionText, setTranscriptionText] = useState('');
    const { Theme, Flex, Box, Button, Text, Spinner } = window.RadixUI;
    const currentNoteUUIDRef = useRef(null);
    const initialSelectionRef = useRef('');
    const confirmedTextRef = useRef('');
    const partialTextRef = useRef('');
    const lastAppliedTextRef = useRef('');

    useEffect(() => {
        const initializeVoskletSpeechToText = async () => {
            try {
                // Get current note data for text replacement
                const noteData = await window.appConnector.getUserCurrentNoteData();
                currentNoteUUIDRef.current = noteData.currentNoteUUID;
                
                // Initialize Vosklet
                const initResult = await window.appConnector.initializeVoskletSpeechToText();
                if (!initResult.success) {
                    setStatus('error');
                    setErrorObj({ message: initResult.error, type: initResult.errorType });
                    return;
                }

                // Start recording with callback channels
                const startResult = await window.appConnector.startVoskletRecording({
                    partialResult: 'vosklet-partial',
                    result: 'vosklet-result', 
                    error: 'vosklet-error',
                    ready: 'vosklet-ready'
                });

                if (!startResult.success) {
                    setStatus('error');
                    setErrorObj({ message: startResult.error, type: startResult.errorType });
                    return;
                }

                setStatus('processing');
                
                // Set initial placeholder text
                await window.appConnector.replaceSelection('Say something...');
                initialSelectionRef.current = 'Say something...';

                // Flush any stale messages from previous sessions
                try {
                    while (await window.appConnector.receiveMessageFromPlugin('vosklet-partial') != null) {}
                    while (await window.appConnector.receiveMessageFromPlugin('vosklet-result') != null) {}
                    while (await window.appConnector.receiveMessageFromPlugin('vosklet-error') != null) {}
                    while (await window.appConnector.receiveMessageFromPlugin('vosklet-ready') != null) {}
                } catch (e) {
                    console.warn('Failed to flush initial Vosklet messages', e);
                }
                 
            } catch (error) {
                console.error('Failed to initialize Vosklet speech-to-text:', error);
                setStatus('error');
                setErrorObj({ message: error.message || 'Unknown error', type: 'INITIALIZATION_ERROR' });
            }
        };

        initializeVoskletSpeechToText();
    }, []);

    useEffect(() => {
        // Listen for Vosklet callback messages
        const pollForMessages = async () => {
            if (status !== 'processing') return;

            try {
                let updated = false;

                // Drain and append all confirmed result chunks
                while (true) {
                    const resultMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-result');
                    if (!resultMessage) break;
                    if (typeof resultMessage.text === 'string') {
                        const chunk = resultMessage.text.trim();
                        if (chunk) {
                            confirmedTextRef.current = confirmedTextRef.current
                                ? `${confirmedTextRef.current} ${chunk}`
                                : chunk;
                            // Clear partial when a result is confirmed
                            partialTextRef.current = '';
                            updated = true;
                        }
                    }
                }

                // Drain partials but keep only the most recent partial text
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

                // Drain errors and surface the first one immediately
                const errorMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-error');
                if (errorMessage) {
                    setStatus('error');
                    setErrorObj({ message: errorMessage.error, type: errorMessage.errorType });
                    return;
                }

                if (updated) {
                    const combined = [confirmedTextRef.current, partialTextRef.current]
                        .filter(Boolean)
                        .join(' ');

                    if (combined !== lastAppliedTextRef.current) {
                        setTranscriptionText(combined);
                        await window.appConnector.replaceSelection(
                            combined || initialSelectionRef.current || ''
                        );
                        lastAppliedTextRef.current = combined;
                    }
                }

            } catch (error) {
                console.error('Error polling for Vosklet messages:', error);
            }
        };

        const interval = setInterval(pollForMessages, 200);
        return () => clearInterval(interval);
    }, [status, transcriptionText]);

    useIntervalPingPlugin(status === 'initializing' || status === 'processing');

    const handleStopClick = async () => {
        try {
            await window.appConnector.stopVoskletRecording();
            await window.appConnector.cleanupVoskletSpeechToText();
            setStatus('stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
            setStatus('error');
            setErrorObj({ message: error.message || 'Failed to stop recording', type: 'STOP_ERROR' });
        }
    };

    return (
        <Theme appearance="dark" accentColor="blue">
            <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100vh', padding: '16px' }}>
                {status === 'initializing' && (
                    <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '24px' }}>
                        <Spinner size="5" />
                        <Text size="3">Initializing speech recognition...</Text>
                    </Box>
                )}

                {status === 'processing' && (
                    <>
                        <>{transcriptionText}</>
                        <Box style={{ textAlign: 'center' }}>
                            {/* Animated voice processing icon */}
                            <div className="voice-processing-animation">
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                            </div>
                            <Text size="3" style={{ marginTop: '16px' }}>Listening...</Text>
                        </Box>
                        <Button 
                            size="3" 
                            color="red" 
                            onClick={handleStopClick}
                            style={{ marginTop: '24px' }}
                        >
                            Stop
                        </Button>
                    </>
                )}

                {status === 'stopped' && (
                    <Box style={{ textAlign: 'center' }}>
                        <Text size="4">Please close the window</Text>
                    </Box>
                )}

                {status === 'error' && (
                    <Box style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Text size="3">Error initializing speech recognition</Text>
                        <Text size="2" color={'red'}>{errorToString(errorObj)}</Text>
                    </Box>
                )}
            </Flex>
        </Theme>
    );
};
