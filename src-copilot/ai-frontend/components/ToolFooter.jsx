import {truncate} from "lodash-es";

export const ToolFooter = ({submitButtonText = "Submit", cancelButtonText = "Cancel",
                               status, setFormState,
                               shouldDisplayNoteSelector = false, noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

    const { Flex, Button } = window.RadixUI;
    return (
        <Flex gap="10px" justify="between" style={{ marginTop: "10px" }}>
            {
                shouldDisplayNoteSelector ?
                    <NoteSelector
                        noteSelectionArr={noteSelectionArr}
                        currentNoteSelectionUUID={currentNoteSelectionUUID}
                        setCurrentNoteSelectionUUID={setCurrentNoteSelectionUUID}
                        status={status}
                    /> : <span />
            }
            <Flex justify="end">
                <Button
                    color="red"
                    disabled={status === "requires-action" || !isThisToolMessageLast}
                    onClick={() => {
                        setFormState("canceled");
                    }} style={{ marginRight: "10px" }}>
                    {cancelButtonText}
                </Button>
                <Button
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

export const NoteSelector = ({ noteSelectionArr = [], currentNoteSelectionUUID, setCurrentNoteSelectionUUID, status }) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    const currentNote = noteSelectionArr.find((note) => note.uuid === currentNoteSelectionUUID);
    const displayTitle = currentNote?.title ? truncate(currentNote.title, { length: 12 }) : 'Select Note';

    const { Select } = window.RadixUI;
    const { FileTextIcon } = window.RadixIcons;
    return (
        <Select.Root
            disabled={status === "requires-action" || !isThisToolMessageLast}
            value={currentNoteSelectionUUID}
            onValueChange={(value) => setCurrentNoteSelectionUUID(value)}
            className="note-selector">
            <Select.Trigger>
                <FileTextIcon
                    style={{
                        display: "inline-block",
                        marginRight: "5px",
                        marginTop: "-4px",
                    }}
                />
                {displayTitle}
            </Select.Trigger>
            <Select.Content position="popper" sideOffset={5}>
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