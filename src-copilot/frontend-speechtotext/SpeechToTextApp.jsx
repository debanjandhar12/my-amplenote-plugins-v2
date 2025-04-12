import {useIntervalPingPlugin} from "../frontend-chat/hooks/useIntervalPingPlugin.jsx";

export const SpeechToTextApp = () => {
    const { useState, useEffect } = window.React;
    const [status, setStatus] = useState('initializing'); // 'initializing', 'processing', 'stopped'
    const { Theme, Flex, Box, Button, Text, Spinner } = window.RadixUI;

    useEffect(() => {
        // Simulate initialization process
        const initializeApp = async () => {
            try {
                // This is a placeholder for the actual initialization code
                // The user will fill this part later
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate initialization delay
                setStatus('processing');
            } catch (error) {
                console.error('Initialization error:', error);
                setStatus('error');
            }
        };

        initializeApp();
    }, []);

    useIntervalPingPlugin();

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
                    <Box style={{ textAlign: 'center', color: '#e11d48' }}>
                        <Text size="3">Error initializing speech recognition</Text>
                    </Box>
                )}
            </Flex>
        </Theme>
    );
};
