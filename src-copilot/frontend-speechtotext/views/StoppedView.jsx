import { TranscriptionTextArea } from '../components/TranscriptionTextArea.jsx';

export const StoppedView = ({ 
    transcriptionText, 
    onTranscriptionChange, 
    currentNoteInfo,
    onInsertToCurrent,
    onInsertToSelected,
    onStartNew,
    isInserting,
    isInserted
}) => {
    const { Flex, Button, Spinner } = window.RadixUI;

    return (
        <>
            <TranscriptionTextArea
                value={transcriptionText || 'No text was transcribed.'}
                onChange={(e) => onTranscriptionChange(e.target.value)}
                placeholder="You can edit the transcribed text here..."
                label="Final Transcription:"
            />

            <Flex direction="column" gap="2">
                {transcriptionText && (
                    <>
                        {currentNoteInfo?.currentNoteUUID && (
                            <Button 
                                size="3" 
                                variant="solid"
                                onClick={onInsertToCurrent}
                                disabled={isInserting || isInserted}
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
                            onClick={onInsertToSelected}
                            color={isInserted ? "green" : "inherit"}
                            disabled={isInserting || isInserted}
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
                    </>
                )}
                <Button 
                    size="3" 
                    variant="outline"
                    onClick={onStartNew}
                    style={{ width: '100%' }}
                >
                    Start New Recording
                </Button>
            </Flex>
        </>
    );
};
