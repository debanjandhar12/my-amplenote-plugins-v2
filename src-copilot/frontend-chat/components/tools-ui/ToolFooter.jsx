import {truncate} from "lodash-es";

export const ToolFooter = ({submitButtonText = "Submit", cancelButtonText = "Cancel",
                               status, setFormState,
                               shouldDisplayNoteSelector = false, noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID, disableNoteSelector = false}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    const isActionDestructive = submitButtonText.toLowerCase().includes('delete')
    || submitButtonText.toLowerCase().includes('remove');

    const { Flex, Button } = window.RadixUI;
    return (
        <Flex gap="10px" justify="between" style={{ marginTop: "10px" }}>
            {
                shouldDisplayNoteSelector ?
                    <NoteSelector
                        noteSelectionArr={noteSelectionArr}
                        currentNoteSelectionUUID={currentNoteSelectionUUID}
                        setCurrentNoteSelectionUUID={setCurrentNoteSelectionUUID}
                        disableNoteSelector={disableNoteSelector}
                        status={status}
                    /> : <span />
            }
            <Flex justify="end" align="center">
                <Button
                    variant={'ghost'}
                    color={'red'}
                    highContrast={true}
                    disabled={status === "requires-action" || !isThisToolMessageLast}
                    onClick={() => {
                        setFormState("canceled");
                    }} style={{ marginRight: "10px" }}>
                    {cancelButtonText}
                </Button>
                <Button
                    color={isActionDestructive ? 'red' : 'primary'}
                    disabled={status === "requires-action" || !isThisToolMessageLast}
                    onClick={() => {
                        setFormState("submitted");
                    }}>
                    {submitButtonText}
                </Button>
            </Flex>
        </Flex>
    )
}

export const NoteSelector = ({ noteSelectionArr = [], currentNoteSelectionUUID,
                                 setCurrentNoteSelectionUUID, status, disableNoteSelector }) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    const currentNote = noteSelectionArr.find((note) => note.uuid === currentNoteSelectionUUID);
    const displayTitle = currentNote?.title ? truncate(currentNote.title, { length: 12 }) : 'Select Note';

    const { Select } = window.RadixUI;
    const { FileTextIcon } = window.RadixIcons;

    const isDisabled = status === "requires-action" || !isThisToolMessageLast || disableNoteSelector;

    // Hacky handle open state cuz it isn't working atm for unknown reasons
    const [open, setOpen] = React.useState(false);
    const selectRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    return (
        <Select.Root
            open={open}
            disabled={isDisabled}
            value={currentNoteSelectionUUID}
            onValueChange={(value) => {
                console.log(value);
                setCurrentNoteSelectionUUID(value);
                setOpen(false);
            }}
            className="note-selector">
            <Select.Trigger 
                onClick={(e) => {
                    if (isDisabled) return;
                    setOpen(!open);
                }}>
                <FileTextIcon
                    style={{
                        display: "inline-block",
                        marginRight: "5px",
                        marginTop: "-4px",
                    }}
                />
                {displayTitle}
            </Select.Trigger>
            <Select.Content position="popper" sideOffset={5} ref={selectRef}>
                {noteSelectionArr.map((note) => (
                    <Select.Item key={note.uuid} value={note.uuid} className="select-item">
                        <span>{note.title}</span>
                        <span style={{ fontSize: "8px", display: "block", lineHeight: "1" }}>
                            {note.uuid}
                        </span>
                    </Select.Item>
                ))}
            </Select.Content>
        </Select.Root>
    );
}