export const useNoteSelector = ({args, setFormData, formData}) => {
    const [noteSelectionArr, setNoteSelectionArr] = React.useState([]);
    const currentNoteSelectionUUID = formData.currentNoteSelectionUUID || null;
    const setCurrentNoteSelectionUUID = (value) => {
        setFormData({...formData, currentNoteSelectionUUID: value});
    };

    React.useEffect(() => {
        const fetchNoteInfo = async () => {
            const noteArray = [];
            if (args.noteUUID) {
                const noteTitle = await appConnector.getNoteTitleByUUID(args.noteUUID);
                noteArray.push({
                    uuid: args.noteUUID,
                    selected: true,
                    title: noteTitle,
                });
            }
            addIfNotPresent(noteArray, userData.currentNoteUUID, userData.currentNoteUUID);
            addIfNotPresent(noteArray, userData.invokerNoteUUID, userData.invokerNoteUUID);
            addIfNotPresent(noteArray, userData.dailyJotNoteUUID, userData.dailyJotNoteTitle);
            setCurrentNoteSelectionUUID(args.noteUUID || noteArray[0]?.uuid);
            setNoteSelectionArr(noteArray);
        };
        fetchNoteInfo();
    }, [args]);

    return [noteSelectionArr, setNoteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID];
}

// Helper Function
const addIfNotPresent = (noteInfo, uuid, title) => {
    if (uuid && !noteInfo.some((note) => note.uuid === uuid)) {
        noteInfo.push({
            uuid,
            selected: noteInfo.length === 0,
            title,
        });
    }
};
