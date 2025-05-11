import {useIntervalPingPlugin} from "../frontend-chat/hooks/useIntervalPingPlugin.jsx";
import {errorToString} from "../frontend-chat/helpers/errorToString.js";

export const SpeechToTextApp = () => {
    const { useState, useEffect } = window.React;
    const [status, setStatus] = useState('initializing'); // 'initializing', 'processing', 'stopped'
    const [errorObj, setErrorObj] = useState(null);
    const { Theme, Flex, Box, Button, Text, Spinner } = window.RadixUI;

    useEffect(() => {
        // Simulate initialization process
        const waitForAppInitialization = async () => {
            while(true) {
                const speechToTextStatus = await window.appConnector.receiveMessageFromPlugin('speechtotext');
                if (speechToTextStatus === 'ready') {
                    setStatus('processing');
                    break;
                }
                else if (speechToTextStatus && typeof speechToTextStatus === 'object') {
                    setStatus('error');
                    setErrorObj(speechToTextStatus);
                    break;
                }
            }
        };

        waitForAppInitialization();
    }, []);

    useIntervalPingPlugin(status === 'initializing' || status === 'processing');

    const handleStopClick = () => {
        setStatus('stopped');
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
