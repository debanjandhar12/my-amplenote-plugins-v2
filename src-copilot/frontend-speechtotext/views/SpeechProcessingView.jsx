import { TranscriptionTextArea } from '../components/TranscriptionTextArea.jsx';

export const SpeechProcessingView = ({ transcriptionText, onStop, onClear }) => {
    const { Flex, Button, Text } = window.RadixUI;

    return (
        <>
            <Flex direction="column" align="center" gap="3" style={{ marginBottom: '16px' }}>
                <div className="voice-processing-animation">
                    {[...Array(5)].map((_, i) => <div key={i} className="voice-wave"></div>)}
                </div>
                <Text size="3">Listening...</Text>
            </Flex>

            <TranscriptionTextArea
                value={transcriptionText || 'Say something...'}
                label="Transcribed Text:"
            />

            <Flex gap="2" justify="center">
                <Button size="3" color="red" onClick={onStop}>
                    Stop Recording
                </Button>
                {transcriptionText && (
                    <Button size="3" variant="outline" onClick={onClear}>
                        Clear
                    </Button>
                )}
            </Flex>
        </>
    );
};
