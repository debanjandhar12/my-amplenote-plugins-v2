import {useIntervalPingPlugin} from "../frontend-chat/hooks/useIntervalPingPlugin.jsx";
import {errorToString} from "../frontend-chat/helpers/errorToString.js";

export const SpeechToTextApp = () => {
    const { useState, useEffect, useRef } = window.React;
    const [status, setStatus] = useState('initializing'); // 'initializing', 'processing', 'stopped', 'error'
    const [errorObj, setErrorObj] = useState(null);
    const [transcriptionText, setTranscriptionText] = useState('');
    const [currentNoteInfo, setCurrentNoteInfo] = useState(null);
    const [isInserting, setIsInserting] = useState(false);
    const { Theme, Flex, Button, Text, Spinner, TextArea, Card } = window.RadixUI;
    const confirmedTextRef = useRef('');
    const partialTextRef = useRef('');

    useEffect(() => {
        const initializeVoskletSpeechToText = async () => {
            try {
                // Get current note data
                const noteData = await window.appConnector.getUserCurrentNoteData();
                setCurrentNoteInfo(noteData);
                
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

                    setTranscriptionText(combined);
                }

            } catch (error) {
                console.error('Error polling for Vosklet messages:', error);
            }
        };

        const interval = setInterval(pollForMessages, 200);
        return () => clearInterval(interval);
    }, [status]);

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

    const handleInsertToCurrentNote = async () => {
        if (!transcriptionText.trim()) return;
        
        setIsInserting(true);
        try {
            await window.appConnector.replaceSelection(transcriptionText);
            // Close the embed after successful insertion
            await window.appConnector.forceEmbedClose();
        } catch (error) {
            console.error('Error inserting text:', error);
            setErrorObj({ message: error.message || 'Failed to insert text', type: 'INSERT_ERROR' });
        } finally {
            setIsInserting(false);
        }
    };

    const handleInsertToSelectedNote = async () => {
        if (!transcriptionText.trim()) return;
        
        setIsInserting(true);
        try {
            const result = await window.appConnector.promptNoteSelection(
                'Select a note to insert the transcribed text:',
                transcriptionText
            );
            
            if (result && result.success) {
                // Close the embed after successful insertion
                await window.appConnector.forceEmbedClose();
            } else if (result && result.cancelled) {
                // User cancelled, just continue
            } else {
                throw new Error(result?.error || 'Failed to insert text to selected note');
            }
        } catch (error) {
            console.error('Error inserting text to selected note:', error);
            setErrorObj({ message: error.message || 'Failed to insert text', type: 'INSERT_ERROR' });
        } finally {
            setIsInserting(false);
        }
    };

    const handleClearText = () => {
        setTranscriptionText('');
        confirmedTextRef.current = '';
        partialTextRef.current = '';
    };

    return (
        <Theme appearance="dark" accentColor="blue">
            <Flex direction="column" gap="4" style={{ height: '100vh', padding: '16px' }}>
                {status === 'initializing' && (
                    <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
                        <Spinner size="5" />
                        <Text size="3">Initializing speech recognition...</Text>
                    </Flex>
                )}

                {status === 'processing' && (
                    <>
                        <Flex direction="column" align="center" gap="3" style={{ marginBottom: '16px' }}>
                            <div className="voice-processing-animation">
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                                <div className="voice-wave"></div>
                            </div>
                            <Text size="3">Listening...</Text>
                        </Flex>

                        <Card style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Text size="2" color="gray" style={{ marginBottom: '8px' }}>
                                Transcribed Text:
                            </Text>
                            <TextArea
                                value={transcriptionText || 'Say something...'}
                                readOnly
                                style={{ 
                                    flex: 1, 
                                    minHeight: '200px',
                                    fontStyle: !transcriptionText ? 'italic' : 'normal',
                                    color: !transcriptionText ? 'gray' : 'inherit'
                                }}
                            />
                        </Card>

                        <Flex gap="2" justify="center">
                            <Button 
                                size="3" 
                                color="red" 
                                onClick={handleStopClick}
                            >
                                Stop Recording
                            </Button>
                            {transcriptionText && (
                                <Button 
                                    size="3" 
                                    variant="outline"
                                    onClick={handleClearText}
                                >
                                    Clear
                                </Button>
                            )}
                        </Flex>
                    </>
                )}

                {status === 'stopped' && (
                    <>
                        <Card style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Text size="2" color="gray" style={{ marginBottom: '8px' }}>
                                Final Transcription:
                            </Text>
                            <TextArea
                                value={transcriptionText || 'No text was transcribed.'}
                                onChange={(e) => setTranscriptionText(e.target.value)}
                                style={{ 
                                    flex: 1, 
                                    minHeight: '200px',
                                    fontStyle: !transcriptionText ? 'italic' : 'normal',
                                    color: !transcriptionText ? 'gray' : 'inherit'
                                }}
                                placeholder="You can edit the transcribed text here..."
                            />
                        </Card>

                        {transcriptionText && (
                            <Flex direction="column" gap="2">
                                {currentNoteInfo?.currentNoteUUID && (
                                    <Button 
                                        size="3" 
                                        onClick={handleInsertToCurrentNote}
                                        disabled={isInserting}
                                        style={{ width: '100%' }}
                                    >
                                        {isInserting ? (
                                            <Flex align="center" gap="2">
                                                <Spinner size="1" />
                                                Inserting...
                                            </Flex>
                                        ) : (
                                            `Insert to Current Note (${currentNoteInfo.currentNoteName || 'Untitled'})`
                                        )}
                                    </Button>
                                )}
                                <Button 
                                    size="3" 
                                    variant="outline"
                                    onClick={handleInsertToSelectedNote}
                                    disabled={isInserting}
                                    style={{ width: '100%' }}
                                >
                                    {isInserting ? (
                                        <Flex align="center" gap="2">
                                            <Spinner size="1" />
                                            Inserting...
                                        </Flex>
                                    ) : (
                                        'Insert to Note...'
                                    )}
                                </Button>
                            </Flex>
                        )}
                    </>
                )}

                {status === 'error' && (
                    <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
                        <Text size="3">Error with speech recognition</Text>
                        <Text size="2" color="red">{errorToString(errorObj)}</Text>
                        <Button 
                            size="3" 
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </Flex>
                )}
            </Flex>
        </Theme>
    );
};
