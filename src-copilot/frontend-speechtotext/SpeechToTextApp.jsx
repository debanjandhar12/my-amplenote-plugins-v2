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
                // Check for partial results
                const partialMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-partial');
                if (partialMessage && partialMessage.text) {
                    const newText = partialMessage.text.trim();
                    if (newText && newText !== transcriptionText) {
                        setTranscriptionText(newText);
                        await window.appConnector.replaceSelection(newText);
                    }
                }

                // Check for final results
                const resultMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-result');
                if (resultMessage && resultMessage.text) {
                    const finalText = resultMessage.text.trim();
                    if (finalText) {
                        setTranscriptionText(finalText);
                        await window.appConnector.replaceSelection(finalText);
                    }
                }

                // Check for errors
                const errorMessage = await window.appConnector.receiveMessageFromPlugin('vosklet-error');
                if (errorMessage) {
                    setStatus('error');
                    setErrorObj({ message: errorMessage.error, type: errorMessage.errorType });
                    return;
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
