import {truncate} from "lodash-es";

export const ToolFooter = ({submitButtonText = "Submit", cancelButtonText = "Cancel",
                               status, setFormState,
                               shouldDisplayNoteSelector = false, noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

    return (
        <RadixUI.Flex gap="10px" justify="between" style={{ marginTop: "10px" }}>
            {
                shouldDisplayNoteSelector ?
                    <NoteSelector
                        noteSelectionArr={noteSelectionArr}
                        currentNoteSelectionUUID={currentNoteSelectionUUID}
                        setCurrentNoteSelectionUUID={setCurrentNoteSelectionUUID}
                        status={status}
                    /> : <span />
            }
            <RadixUI.Flex justify="end">
                <RadixUI.Button
                    color="red"
                    disabled={status === "requires-action" || !isThisToolMessageLast}
                    onClick={() => {
                        setFormState("canceled");
                    }} style={{ marginRight: "10px" }}>
                    {cancelButtonText}
                </RadixUI.Button>
                <RadixUI.Button
                    disabled={status === "requires-action" || !isThisToolMessageLast}
                    onClick={() => {
                        setFormState("submitted");
                    }}>
                    {submitButtonText}
                </RadixUI.Button>
            </RadixUI.Flex>
        </RadixUI.Flex>
    )
}

export const NoteSelector = ({ noteSelectionArr, currentNoteSelectionUUID, setCurrentNoteSelectionUUID, status}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    return (
        <RadixUI.Select.Root
            disabled={status === "requires-action" || !isThisToolMessageLast}
            value={currentNoteSelectionUUID}
            onValueChange={(value) => {
                setCurrentNoteSelectionUUID(value);
            }}>
            <RadixUI.Select.Trigger>
                <RadixIcons.FileTextIcon
                    style={{
                        display: "inline-block",
                        marginRight: "5px",
                        marginTop: "-4px",
                    }}
                />
                {truncate(noteSelectionArr.find((note) => note.uuid === currentNoteSelectionUUID)?.title, { length: 12 })}
            </RadixUI.Select.Trigger>
            <RadixUI.Select.Content position="popper">
                {noteSelectionArr.map((note) => (
                    <RadixUI.Select.Item key={note.uuid} value={note.uuid}>
                        <span>{note.title}</span>
                        <span style={{ fontSize: "8px", display: "block", lineHeight: "1" }}>
                                            {note.uuid}
                                        </span>
                    </RadixUI.Select.Item>
                ))}
            </RadixUI.Select.Content>
        </RadixUI.Select.Root>
    )
}