import {truncate} from "lodash-es";

export const ToolFooter = ({submitButtonText = "Submit", cancelButtonText = "Cancel",
                               status, setFormState,
                               shouldDisplayNoteSelector = false, noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

    const { Flex, Button } = RadixUI;
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

export const NoteSelector = ({ noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID, status}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

    const { Select, IconButton } = RadixUI;
    const { FileTextIcon } = RadixIcons;
    return (
        <Select.Root
            disabled={status === "requires-action" || !isThisToolMessageLast}
            value={currentNoteSelectionUUID}
            onValueChange={(value) => {
                setCurrentNoteSelectionUUID(value);
            }}>
            <Select.Trigger>
                <FileTextIcon
                    style={{
                        display: "inline-block",
                        marginRight: "5px",
                        marginTop: "-4px",
                    }}
                />
                {truncate(noteSelectionArr.find((note) => note.uuid === currentNoteSelectionUUID)?.title, { length: 12 })}
            </Select.Trigger>
            <Select.Content position="popper">
                {noteSelectionArr.map((note) => (
                    <Select.Item key={note.uuid} value={note.uuid}>
                        <span>{note.title}</span>
                        <span style={{ fontSize: "8px", display: "block", lineHeight: "1" }}>
                                            {note.uuid}
                                        </span>
                    </Select.Item>
                ))}
            </Select.Content>
        </Select.Root>
    )
}