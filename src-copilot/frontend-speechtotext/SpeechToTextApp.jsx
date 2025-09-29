import { useSpeechToText } from "./hooks/useSpeechToText.js";
import { useCurrentNotePolling } from "./hooks/useCurrentNotePolling.jsx";
import { InitializingView } from "./views/InitializingView.jsx";
import { SpeechProcessingView } from "./views/SpeechProcessingView.jsx";
import { StoppedView } from "./views/StoppedView.jsx";
import { ErrorView } from "./views/ErrorView.jsx";

export const SpeechToTextApp = () => {
    const { useState } = window.React;
    const [isInserting, setIsInserting] = useState(false);
    const [isInserted, setIsInserted] = useState(false);
    const { Theme, Flex } = window.RadixUI;

    const {
        status,
        errorObj,
        transcriptionText,
        setTranscriptionText,
        resetTranscription,
        stopRecording,
        startNewRecording
    } = useSpeechToText();

    const currentNoteInfo = useCurrentNotePolling();

    const handleClear = () => {
        resetTranscription();
        setIsInserted(false);
    };

    const handleStartNew = async () => {
        setIsInserted(false);
        await startNewRecording();
    };



    const handleInsertToCurrentNote = async () => {
        if (!currentNoteInfo?.currentNoteUUID) {
            console.error('No current note available');
            return;
        }
        
        if (!transcriptionText.trim()) return;
        
        setIsInserting(true);
        try {
            await window.appConnector.insertNoteContent({uuid: currentNoteInfo.currentNoteUUID}, transcriptionText, {atEnd: true});
            setIsInserted(true);
        } catch (error) {
            console.error('Error inserting text:', error);
        } finally {
            setIsInserting(false);
        }
    };

    const handleInsertToSelectedNote = async () => {
        if (!transcriptionText.trim()) return;
        
        setIsInserting(true);
        try {
            const selectedNote = await window.appConnector.prompt('Select a note to insert the transcribed text:', {
                inputs: [
                    {
                        type: "note",
                        label: "Select Note"
                    }
                ]
            });
            
            if (!selectedNote.uuid) {
                setIsInserting(false);
                return;
            }
            
            await window.appConnector.insertNoteContent({uuid: selectedNote.uuid}, transcriptionText, {atEnd: true});
            setIsInserted(true);
        } catch (error) {
            console.error('Error inserting text to selected note:', error);
        } finally {
            setIsInserting(false);
        }
    };

    const renderCurrentView = () => {
        switch (status) {
            case 'initializing':
                return <InitializingView />;
            case 'processing':
                return (
                    <SpeechProcessingView
                        transcriptionText={transcriptionText}
                        onStop={stopRecording}
                        onClear={handleClear}
                    />
                );
            case 'stopped':
                return (
                    <StoppedView
                        transcriptionText={transcriptionText}
                        onTranscriptionChange={setTranscriptionText}
                        currentNoteInfo={currentNoteInfo}
                        onInsertToCurrent={handleInsertToCurrentNote}
                        onInsertToSelected={handleInsertToSelectedNote}
                        onStartNew={handleStartNew}
                        isInserting={isInserting}
                        isInserted={isInserted}
                    />
                );
            case 'error':
                return <ErrorView errorObj={errorObj} />;
            default:
                return null;
        }
    };

    return (
        <Theme appearance="dark" accentColor="blue">
            <Flex direction="column" gap="4" style={{ height: '100vh', padding: '16px' }}>
                {renderCurrentView()}
            </Flex>
        </Theme>
    );
};