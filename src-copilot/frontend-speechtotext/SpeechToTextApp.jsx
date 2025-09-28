import {useIntervalPingPlugin} from "../frontend-chat/hooks/useIntervalPingPlugin.jsx";
import {errorToString} from "../frontend-chat/helpers/errorToString.js";
import {useCurrentNotePolling} from "./hooks/useCurrentNotePolling.jsx";

export const SpeechToTextApp = () => {
    const { useState, useEffect, useRef } = window.React;
    const [status, setStatus] = useState('initializing');
    const [errorObj, setErrorObj] = useState(null);
    const [transcriptionText, setTranscriptionText] = useState('');
    const [isInserting, setIsInserting] = useState(false);
    const { Theme, Flex, Button, Text, Spinner, TextArea, Card } = window.RadixUI;
    const confirmedTextRef = useRef('');
    const partialTextRef = useRef('');

    const currentNoteInfo = useCurrentNotePolling();

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

    useEffect(() => {
        initializeVosklet();
    }, []);

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

    useIntervalPingPlugin(status === 'initializing' || status === 'processing');

    const handleStopClick = async () => {
        try {
            await window.appConnector.stopVoskletRecording();
            await window.appConnector.cleanupVoskletSpeechToText();
            setStatus('stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
            setError(error.message || 'Failed to stop recording', 'STOP_ERROR');
        }
    };

    const insertText = async (insertFn, errorType = 'INSERT_ERROR') => {
        if (!transcriptionText.trim()) return;
        
        setIsInserting(true);
        try {
            await insertFn();
            await window.appConnector.forceEmbedClose();
        } catch (error) {
            console.error('Error inserting text:', error);
            setErrorObj({ message: error.message || 'Failed to insert text', type: errorType });
        } finally {
            setIsInserting(false);
        }
    };

    const handleInsertToCurrentNote = () => insertText(
        () => window.appConnector.replaceSelection(transcriptionText)
    );

    const handleInsertToSelectedNote = () => insertText(async () => {
        const result = await window.appConnector.promptNoteSelection(
            'Select a note to insert the transcribed text:',
            transcriptionText
        );
        
        if (result?.success) {
            return;
        } else if (result?.cancelled) {
            throw new Error('User cancelled');
        } else {
            throw new Error(result?.error || 'Failed to insert text to selected note');
        }
    });

    const renderInsertButton = (onClick, children, primary = false) => (
        <Button 
            size="3" 
            variant={primary ? "solid" : "outline"}
            onClick={onClick}
            disabled={isInserting}
            style={{ width: '100%' }}
        >
            {isInserting ? (
                <Flex align="center" gap="2">
                    <Spinner size="1" />
                    Inserting...
                </Flex>
            ) : children}
        </Button>
    );

    const renderTextArea = (value, onChange = null, placeholder = null) => (
        <TextArea
            value={value}
            onChange={onChange}
            readOnly={!onChange}
            placeholder={placeholder}
            style={{ 
                flex: 1, 
                minHeight: '200px',
                fontStyle: !value ? 'italic' : 'normal',
                color: !value ? 'gray' : 'inherit'
            }}
        />
    );

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
                                {[...Array(5)].map((_, i) => <div key={i} className="voice-wave"></div>)}
                            </div>
                            <Text size="3">Listening...</Text>
                        </Flex>

                        <Card style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Text size="2" color="gray" style={{ marginBottom: '8px' }}>
                                Transcribed Text:
                            </Text>
                            {renderTextArea(transcriptionText || 'Say something...')}
                        </Card>

                        <Flex gap="2" justify="center">
                            <Button size="3" color="red" onClick={handleStopClick}>
                                Stop Recording
                            </Button>
                            {transcriptionText && (
                                <Button size="3" variant="outline" onClick={resetTranscription}>
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
                            {renderTextArea(
                                transcriptionText || 'No text was transcribed.',
                                (e) => setTranscriptionText(e.target.value),
                                "You can edit the transcribed text here..."
                            )}
                        </Card>

                        {transcriptionText && (
                            <Flex direction="column" gap="2">
                                {currentNoteInfo?.currentNoteUUID && renderInsertButton(
                                    handleInsertToCurrentNote,
                                    `Insert to Current Note (${currentNoteInfo.currentNoteName || 'Untitled'})`,
                                    true
                                )}
                                {renderInsertButton(handleInsertToSelectedNote, 'Insert to Note...')}
                            </Flex>
                        )}
                    </>
                )}

                {status === 'error' && (
                    <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
                        <Text size="3">Error with speech recognition</Text>
                        <Text size="2" color="red">{errorToString(errorObj)}</Text>
                        <Button size="3" variant="outline" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </Flex>
                )}
            </Flex>
        </Theme>
    );
};