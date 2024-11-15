import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {capitalize, truncate} from "lodash-es";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";

/**
 * Creates a tool that allows user to insert multiple items into a note.
 */
export const createGenericMultiInsertTool = ({
toolName, description, parameters,
triggerCondition, itemName, parameterPathForInsertItemArray,
onInitFunction = () => {}, insertItemFunction
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName: toolName,
        description: description,
        parameters: parameters,
        triggerCondition: triggerCondition,
        render: ({args, result, addResult, status}) => {
            const [noteInfoMapArr, setNoteInfoMapArr] = React.useState([]);
            const [formError, setFormError] = React.useState(null);
            const [formState, setFormState] = React.useState('loading'); // loading -> waitingForUserInput -> submitting -> completed / canceled
            const [insertItemArray, setInsertItemArray] = React.useState([]);
            const [insertItemResultArray, setInsertItemResultArray] = React.useState([]);
            const [failedInsertItemArray, setFailedInsertItemArray] = React.useState([]);
            const threadRuntime = AssistantUI.useThreadRuntime();
            const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);

            // == On init (get note title, setup item array state, invoke onInitFunction) ==
            React.useEffect(() => {
                (async () => {
                    if (args['noteUUID']) {
                        const noteInfoMapArr = [{
                            uuid: args['noteUUID'],
                            selected: true,
                            title: await appConnector.getNoteTitleByUUID(args['noteUUID'])
                        }];
                        if (userData.currentNoteUUID && userData.currentNoteUUID.trim() !== '' &&
                            noteInfoMapArr.filter(note => note.uuid === userData.currentNoteUUID).length === 0) {
                            noteInfoMapArr.push({
                                uuid: userData.currentNoteUUID,
                                selected: true,
                                title: userData.currentNoteTitle
                            });
                        }
                        if (userData.dailyJotNoteUUID && userData.dailyJotNoteUUID.trim() !== '' &&
                            noteInfoMapArr.filter(note => note.uuid === userData.dailyJotNoteUUID).length === 0) {
                            noteInfoMapArr.push({
                                uuid: userData.dailyJotNoteUUID,
                                selected: true,
                                title: userData.dailyJotNoteTitle
                            });
                        }
                        setNoteInfoMapArr(noteInfoMapArr);
                    }
                    try {
                        setInsertItemArray(
                            args[parameterPathForInsertItemArray].map(item => ({
                                item,
                                checked: true
                            }))
                        );
                        await onInitFunction({
                            args,
                            threadRuntime,
                            insertItemArray,
                            setInsertItemArray
                        });
                        setFormState('waitingForUserInput');
                    } catch (e) {
                        console.log(e);
                        setFormError(e);
                    }
                })();
            }, []);

            // == Handle result on formState changes ==
            React.useEffect(() => {
                if (formError) {
                    const formErrorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                    addResult('Error encountered during tool execution: ' + formErrorMessage);
                }
                else if (formState === 'canceled') {
                    if (!result) {
                        addResult(`User canceled the ${itemName} creation process intentionally. Wait for further instructions. User will hate you if you call this again without finding out what he is thinking.`
                            + `${capitalize(itemName)} suggested in this interaction: ${JSON.stringify(insertItemArray)}`);
                        threadRuntime.cancelRun();
                    }
                }
                else if (formState === 'completed') {
                    addResult(`Function call completed successfully. User has interactively selected ${itemName} to insert into note ${noteInfoMapArr.filter(note => note.selected)[0].title} (uuid: ${noteInfoMapArr.filter(note => note.selected)[0].uuid}) and those were inserted successfully.`
                        + `${capitalize(itemName)} added in this interaction: ${JSON.stringify(insertItemArray.filter(item => item.checked))}`);
                }
            }, [formState]);

            // ===== Render UI =====
            if (formError) {
                const formErrorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                return <ToolCardMessage text={"Error: " + formErrorMessage} color="red"/>
            } else if (formState === 'loading') {
                return <></>
            } else if (formState === 'canceled') {
                return <ToolCardMessage text={`${(capitalize(itemName))} creation canceled.`}/>
            } else if (formState === 'submitting') {
                (async () => {
                    let lastError = null;
                    for (const item of insertItemArray.filter(item => item.checked)) {
                        try {
                            const result = await insertItemFunction({args, item: item.item, selectedNoteUUID: noteInfoMapArr.filter(note => note.selected)[0].uuid})
                                || item.item;
                            setInsertItemResultArray([...insertItemResultArray, result]);
                        } catch (e) {
                            setFailedInsertItemArray([...failedInsertItemArray, item]);
                            lastError = e;
                            console.log(e);
                        }
                    }
                    if (failedInsertItemArray.length === insertItemArray.filter(item => item.checked).length) {
                        setFormError(lastError);
                    }
                    setFormState('completed');
                })();
                return <ToolCardMessage
                    text={`Inserting ${itemName}...`}/>
            } else if (formState === 'completed') {
                const successCount = insertItemResultArray.length;
                const failedCount = failedInsertItemArray.length;
                return <ToolCardMessageWithResult
                    text={`${successCount} ${itemName} inserted successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`}
                    result={JSON.stringify(insertItemResultArray)}/>
            }

            const allItemKeys = insertItemArray.reduce((keys, current) => {
                        Object.keys(current.item).forEach((key) => {
                                    if (!keys.includes(key)) {
                                                keys.push(key);
                                    }
                        });
                        return keys;
            }, []);
            return (
                <ToolCardContainer>
                    <RadixUI.Text>Select {itemName} to insert into note:</RadixUI.Text>
                    <RadixUI.Table.Root>
                        <RadixUI.Table.Header>
                            <RadixUI.Table.Row>
                                <RadixUI.Table.ColumnHeaderCell>Checkbox</RadixUI.Table.ColumnHeaderCell>
                                {allItemKeys.map(key =>
                                    <RadixUI.Table.ColumnHeaderCell key={key}>{key}</RadixUI.Table.ColumnHeaderCell>
                                )}
                            </RadixUI.Table.Row>
                        </RadixUI.Table.Header>
                        <RadixUI.Table.Body>
                            {insertItemArray.map((item, index) => (
                                <RadixUI.Table.Row key={index}>
                                    <RadixUI.Table.RowHeaderCell>
                                        <RadixUI.Checkbox
                                            checked={item.checked}
                                            disabled={status === 'requires-action' || !isThisToolMessageLast}
                                            onCheckedChange={(checked) => {
                                                const newItemArray = [...insertItemArray];
                                                newItemArray[index].checked = checked;
                                                setInsertItemArray(newItemArray);
                                            }}
                                        />
                                    </RadixUI.Table.RowHeaderCell>
                                    {allItemKeys.map(key =>
                                        <RadixUI.Table.Cell
                                            key={key}>{insertItemArray[index].item[key]}</RadixUI.Table.Cell>
                                    )}
                                </RadixUI.Table.Row>
                            ))}
                        </RadixUI.Table.Body>
                    </RadixUI.Table.Root>
                    <RadixUI.Flex gap="10px" justify="between" style={{marginTop: '10px'}}>
                        <RadixUI.Select.Root value={noteInfoMapArr.filter(note => note.selected)[0].uuid} onValueChange={(value) => {
                            setNoteInfoMapArr(noteInfoMapArr.map(note => {
                                if (note.uuid === value) {
                                    return {...note, selected: true};
                                }
                                return {...note, selected: false};
                            }));
                        }}>
                            <RadixUI.Select.Trigger>
                                <RadixIcons.FileTextIcon style={{ display: 'inline-block', marginRight: '5px', marginTop: '-4px' }} />{truncate(noteInfoMapArr.filter(note => note.selected)[0].title, { length: 12 })}
                            </RadixUI.Select.Trigger>
                            <RadixUI.Select.Content position="popper">
                            {noteInfoMapArr.map((note) => (
                                    <RadixUI.Select.Item key={note.uuid} value={note.uuid}>
                                        <>
                                            <span>{note.title}</span>
                                            <span style={{fontSize: '8px', display: 'block', lineHeight: '1'}}>{note.uuid}</span>
                                        </>
                                    </RadixUI.Select.Item>
                                ))}
                            </RadixUI.Select.Content>
                        </RadixUI.Select.Root>
                        <RadixUI.Flex justify="end">
                            <RadixUI.Button color="red"
                                            disabled={status === 'requires-action' || !isThisToolMessageLast}
                                            onClick={() => {
                                                setFormState('canceled')
                                            }}
                                            style={{marginRight: '10px'}}>
                                Cancel
                            </RadixUI.Button>
                            <RadixUI.Button
                                disabled={status === 'requires-action' || !isThisToolMessageLast}
                                onClick={() => {
                                    setFormState('submitting')
                                }}>
                                Insert Selected {itemName}
                            </RadixUI.Button>
                        </RadixUI.Flex>
                    </RadixUI.Flex>
                </ToolCardContainer>
            );
        }
    });
}