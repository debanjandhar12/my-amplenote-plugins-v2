export function useCurrentNotePolling() {
    const { useState, useEffect } = window.React;
    const [currentNoteInfo, setCurrentNoteInfo] = useState(null);

    useEffect(() => {
        const updateCurrentNoteData = async () => {
            try {
                const noteData = await window.appConnector.getUserCurrentNoteData();
                setCurrentNoteInfo(noteData);
            } catch (error) {
                console.warn('Failed to get current note data:', error);
            }
        };

        updateCurrentNoteData();
        const intervalId = setInterval(updateCurrentNoteData, 4000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    return currentNoteInfo;
}