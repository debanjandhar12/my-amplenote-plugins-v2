import { ToolCardMessage } from "../components/ToolCardMessage.jsx";
import { ToolCardMessageWithResult } from "../components/ToolCardMessageWithResult.jsx";
import { capitalize, truncate } from "lodash-es";
import { ToolCardContainer } from "../components/ToolCardContainer.jsx";

/**
 * Creates a tool that allows user to insert multiple items into a note.
 */
export const createGenericMultiInsertTool = ({
                                                 toolName,
                                                 description,
                                                 parameters,
                                                 triggerCondition,
                                                 itemName,
                                                 parameterPathForInsertItemArray,
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
            const [insertItemArray, setInsertItemArray] = React.useState([]);
            const [insertItemResultArray, setInsertItemResultArray] = React.useState([]);
            const [failedInsertItemArray, setFailedInsertItemArray] = React.useState([]);
            const threadRuntime = AssistantUI.useThreadRuntime();
            const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

            // == On init (get note title, setup item array state, invoke onInitFunction) ==
            React.useEffect(() => {
                const initialize = async () => {
                    try {
                        const noteInfo = [];
                        if (args["noteUUID"]) {
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
                            console.log(userData.dailyJotNoteUUID);
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
                        setInsertItemArray(args[parameterPathForInsertItemArray].map((item) => ({
                            item,
                            checked: true,
                        })));
                        await onInitFunction({
                            args,
                            threadRuntime,
                            insertItemArray,
                            setInsertItemArray,
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
                    const formErrorMessage =
                        formError.message || JSON.stringify(formError) || formError.toString();
                    addResult("Error encountered during tool execution: " + formErrorMessage);
                } else if (formState === "canceled") {
                    if (!result) {
                        addResult(
                            `User canceled the ${itemName} creation process intentionally. Wait for further instructions. User will hate you if you call this again without finding out what they are thinking. ` +
                            `${capitalize(itemName)} suggested in this interaction: ${JSON.stringify(
                                insertItemArray
                            )}`
                        );
                        threadRuntime.cancelRun();
                    }
                } else if (formState === "submitting") {
                    const submitItems = async () => {
                        let lastError = null;
                        const selectedItems = insertItemArray.filter((item) => item.checked);
                        const selectedNote = noteInfoMapArr.find((note) => note.selected);
                        const successResults = [];
                        const failedItems = [];

                        for (const item of selectedItems) {
                            try {
                                const result =
                                    (await insertItemFunction({
                                        args,
                                        item: item.item,
                                        selectedNoteUUID: selectedNote.uuid,
                                    })) || item.item;
                                successResults.push(result);
                            } catch (e) {
                                failedItems.push(item);
                                lastError = e;
                                console.error(e);
                            }
                        }

                        setInsertItemResultArray(successResults);
                        setFailedInsertItemArray(failedItems);

                        if (failedItems.length === selectedItems.length) {
                            setFormError(lastError);
                        } else {
                            setFormState("completed");
                        }
                    };
                    submitItems();
                } else if (formState === "completed") {
                    addResult(
                        `Function call completed successfully. User has interactively selected ${itemName} to insert into note ${
                            noteInfoMapArr.find((note) => note.selected).title
                        } (uuid: ${
                            noteInfoMapArr.find((note) => note.selected).uuid
                        }) and those were inserted successfully. ` +
                        `${capitalize(itemName)} added in this interaction: ${JSON.stringify(
                            insertItemArray.filter((item) => item.checked)
                        )}`
                    );
                }
            }, [formState]);

            // ===== Render UI =====
            if (formError) {
                const formErrorMessage =
                    formError.message || JSON.stringify(formError) || formError.toString();
                return <ToolCardMessage text={"Error: " + formErrorMessage} color="red" />;
            } else if (formState === "loading") {
                return null;
            } else if (formState === "canceled") {
                return <ToolCardMessage text={`${capitalize(itemName)} creation canceled.`} />;
            } else if (formState === "submitting") {
                return <ToolCardMessage text={`Inserting ${itemName}...`} />;
            } else if (formState === "completed") {
                const successCount = insertItemResultArray.length;
                const failedCount = failedInsertItemArray.length;
                return (
                    <ToolCardMessageWithResult
                        text={`${successCount} ${itemName} inserted successfully${
                            failedCount > 0 ? `, ${failedCount} failed` : ""
                        }.`}
                        result={JSON.stringify(insertItemResultArray)}
                    />
                );
            }

            const allItemKeys = insertItemArray.reduce((keys, current) => {
                Object.keys(current.item).forEach((key) => {
                    if (!keys.includes(key)) {
                        keys.push(key);
                    }
                });
                return keys;
            }, []);

            const selectedNote = noteInfoMapArr.find((note) => note.selected);
            return (
                <ToolCardContainer>
                    <RadixUI.Text>Select {itemName} to insert into note:</RadixUI.Text>
                    <RadixUI.Table.Root>
                        <RadixUI.Table.Header>
                            <RadixUI.Table.Row>
                                <RadixUI.Table.ColumnHeaderCell>Checkbox</RadixUI.Table.ColumnHeaderCell>
                                {allItemKeys.map((key) => (
                                    <RadixUI.Table.ColumnHeaderCell key={key}>
                                        {key}
                                    </RadixUI.Table.ColumnHeaderCell>
                                ))}
                            </RadixUI.Table.Row>
                        </RadixUI.Table.Header>
                        <RadixUI.Table.Body>
                            {insertItemArray.map((item, index) => (
                                <RadixUI.Table.Row key={index}>
                                    <RadixUI.Table.RowHeaderCell>
                                        <RadixUI.Checkbox
                                            checked={item.checked}
                                            disabled={
                                                status === "requires-action" || !isThisToolMessageLast
                                            }
                                            onCheckedChange={(checked) => {
                                                const newItemArray = [...insertItemArray];
                                                newItemArray[index].checked = checked;
                                                setInsertItemArray(newItemArray);
                                            }}
                                        />
                                    </RadixUI.Table.RowHeaderCell>
                                    {allItemKeys.map((key) => (
                                        <RadixUI.Table.Cell key={key}>
                                            {item.item[key]}
                                        </RadixUI.Table.Cell>
                                    ))}
                                </RadixUI.Table.Row>
                            ))}
                        </RadixUI.Table.Body>
                    </RadixUI.Table.Root>
                    <RadixUI.Flex gap="10px" justify="between" style={{ marginTop: "10px" }}>
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
                                <RadixIcons.FileTextIcon
                                    style={{
                                        display: "inline-block",
                                        marginRight: "5px",
                                        marginTop: "-4px",
                                    }}
                                />
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
                        <RadixUI.Flex justify="end">
                            <RadixUI.Button
                                color="red"
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onClick={() => {
                                    setFormState("canceled");
                                }} style={{ marginRight: "10px" }}>
                                Cancel
                            </RadixUI.Button>
                            <RadixUI.Button
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onClick={() => {
                                    setFormState("submitting");
                                }}>
                                Insert Selected {itemName}
                            </RadixUI.Button>
                        </RadixUI.Flex>
                    </RadixUI.Flex>
                </ToolCardContainer>
            );
        },
    });
};