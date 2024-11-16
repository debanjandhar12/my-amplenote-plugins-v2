import { ToolCardMessage } from "../components/ToolCardMessage.jsx";
import { ToolCardMessageWithResult } from "../components/ToolCardMessageWithResult.jsx";
import { capitalize } from "lodash-es";
import { ToolCardContainer } from "../components/ToolCardContainer.jsx";

/**
 * Creates a tool that allows user to insert a single item into a note.
 */
export const createGenericInsertTool = ({
                                            toolName,
                                            description,
                                            parameters,
                                            triggerCondition,
                                            itemName,
                                            parameterPathForInsertItem,
                                            onInitFunction = () => {},
                                            insertItemFunction,
                                        }) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({ args, result, addResult, status }) => {
            const [noteInfoMapArr, setNoteInfoMapArr] = React.useState([]);
            const [formError, setFormError] = React.useState(null);
            const [formState, setFormState] = React.useState("loading");
            const [insertItem, setInsertItem] = React.useState("");
            const [insertItemResult, setInsertItemResult] = React.useState(null);
            const noteSelectorEnabled = args["noteUUID"] != null;
            const threadRuntime = AssistantUI.useThreadRuntime();
            const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

            // == On init (get note title, setup item state, invoke onInitFunction) ==
            React.useEffect(() => {
                const initialize = async () => {
                    try {
                        const noteInfo = [];
                        if (noteSelectorEnabled) {
                            const noteTitle = await appConnector.getNoteTitleByUUID(args["noteUUID"]);
                            noteInfo.push({
                                uuid: args["noteUUID"],
                                selected: true,
                                title: noteTitle,
                            });
                            if (userData.currentNoteUUID && userData.currentNoteUUID.trim() !== "" &&
                                !noteInfo.some((note) => note.uuid === userData.currentNoteUUID)) {
                                noteInfo.push({
                                    uuid: userData.currentNoteUUID,
                                    selected: noteInfo.length === 0,
                                    title: userData.currentNoteTitle,
                                });
                            }
                            if (userData.dailyJotNoteUUID && userData.dailyJotNoteUUID.trim() !== "" &&
                                !noteInfo.some((note) => note.uuid === userData.dailyJotNoteUUID)) {
                                noteInfo.push({
                                    uuid: userData.dailyJotNoteUUID,
                                    selected: noteInfo.length === 0,
                                    title: userData.dailyJotNoteTitle,
                                });
                            }
                            setNoteInfoMapArr(noteInfo);
                        }
                        setInsertItem(args[parameterPathForInsertItem]);
                        await onInitFunction({
                            args,
                            threadRuntime,
                            insertItem,
                            setInsertItem,
                        });
                        setFormState("waitingForUserInput");
                    } catch (e) {
                        console.error(e);
                        setFormError(e);
                    }
                };
                initialize();
            }, []);

            // == Handle result on formState changes ==
            React.useEffect(() => {
                if (formError) {
                    const formErrorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                    addResult("Error encountered during tool execution: " + formErrorMessage);
                } else if (formState === "canceled") {
                    if (!result) {
                        addResult(`User canceled the ${itemName} creation process intentionally. Wait for further instructions.`);
                        threadRuntime.cancelRun();
                    }
                } else if (formState === "submitting") {
                    const submitItem = async () => {
                        try {
                            const selectedNote = noteInfoMapArr.find((note) => note.selected);
                            const result = await insertItemFunction({
                                args,
                                item: insertItem,
                                selectedNoteUUID: selectedNote?.uuid,
                            });
                            setInsertItemResult(result || insertItem);
                            setFormState("completed");
                        } catch (e) {
                            console.error(e);
                            setFormError(e);
                        }
                    };
                    submitItem();
                } else if (formState === "completed") {
                    const selectedNote = noteInfoMapArr.find((note) => note.selected);
                    addResult(
                        `Function call completed successfully. User has interactively edited ${itemName} to insert ${
                            noteSelectorEnabled ? `into note ${selectedNote.title} (uuid: ${selectedNote.uuid})` : ""
                        } and it was inserted successfully. ${capitalize(itemName)} added in this interaction: ${JSON.stringify(insertItem)}`
                    );
                }
            }, [formState]);

            // ===== Render UI =====
            if (formError) {
                const formErrorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                return <ToolCardMessage text={"Error: " + formErrorMessage} color="red" />;
            } else if (formState === "loading") {
                return null;
            } else if (formState === "canceled") {
                return <ToolCardMessage text={`${capitalize(itemName)} creation canceled.`} />;
            } else if (formState === "submitting") {
                return <ToolCardMessage text={`Inserting ${itemName}...`} />;
            } else if (formState === "completed") {
                return <ToolCardMessageWithResult text={`${itemName} inserted successfully.`} result={JSON.stringify(insertItemResult)} />;
            }

            const selectedNote = noteInfoMapArr.find((note) => note.selected);
            return (
                <ToolCardContainer>
                    <RadixUI.Text>Edit {itemName} to insert into note:</RadixUI.Text>
                    <RadixUI.TextArea
                        value={insertItem}
                        disabled={status === "requires-action" || !isThisToolMessageLast}
                        onChange={(e) => setInsertItem(e.target.value)}
                        style={{ width: "100%", minHeight: "100px", marginTop: "10px" }}
                    />
                    <RadixUI.Flex gap="10px" justify="between" style={{ marginTop: "10px" }}>
                        {noteSelectorEnabled ? (
                            <RadixUI.Select.Root
                                style={{ display: args["noteUUID"] ? "none" : "block" }}
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                value={selectedNote.uuid}
                                onValueChange={(value) => {
                                    setNoteInfoMapArr(noteInfoMapArr.map((note) => ({
                                        ...note,
                                        selected: note.uuid === value,
                                    })));
                                }}>
                                <RadixUI.Select.Trigger>
                                    <RadixIcons.FileTextIcon style={{ display: "inline-block", marginRight: "5px", marginTop: "-4px" }} />
                                    {truncate(selectedNote.title, { length: 12 })}
                                </RadixUI.Select.Trigger>
                                <RadixUI.Select.Content position="popper">
                                    {noteInfoMapArr.map((note) => (
                                        <RadixUI.Select.Item key={note.uuid} value={note.uuid}>
                                            <span>{note.title}</span>
                                            <span style={{ fontSize: "8px", display: "block", lineHeight: "1" }}>
                                                {note.uuid}
                                            </span>
                                        </RadixUI.Select.Item>
                                    ))}
                                </RadixUI.Select.Content>
                            </RadixUI.Select.Root>
                        ) : <span />}
                        <RadixUI.Flex justify="end">
                            <RadixUI.Button
                                color="red"
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onClick={() => setFormState("canceled")}
                                style={{ marginRight: "10px" }}>
                                Cancel
                            </RadixUI.Button>
                            <RadixUI.Button
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onClick={() => setFormState("submitting")}>
                                Insert {itemName}
                            </RadixUI.Button>
                        </RadixUI.Flex>
                    </RadixUI.Flex>
                </ToolCardContainer>
            );
        },
    });
};