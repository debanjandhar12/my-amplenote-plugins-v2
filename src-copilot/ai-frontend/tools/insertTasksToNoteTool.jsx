import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardContainer} from "../components/ToolCardContainer.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const insertTasksToNoteTool = () => {
    return makeAssistantToolUI({
        toolName: "insertTasksToNoteTool",
        description: "Create tasks and insert to user's note. ",
        parameters: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            taskContent: {
                                type: "string",
                                minLength: 1,
                                description: "The content of the task."
                            },
                            taskStartAt: {
                                type: "string",
                                format: "date-time",
                                description: "The start date and time of the task in ISO format (optional)."
                            },
                        },
                        required: ["taskContent"]
                    }
                },
                noteUUID: {
                    type: "string",
                    description: "The UUID of the note to insert the task into."
                }
            },
            required: ["tasks", "noteUUID"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@tasks"),
        render: (({args, result, addResult, status}) => {
            // Store formState: pending -> submitting -> completed / pending -> canceled
            const [formState, setFormState] = React.useState();
            const [error, setError] = React.useState(null); // Filled whenever error occurs
            const [tasks, setTasks] = React.useState([]);
            const [noteTitle, setNoteTitle] = React.useState('');
            React.useEffect(() => {
                if (args) {
                    setTasks((args.tasks || []).map(task => ({
                        taskContent: task.taskContent,
                        taskStartAt: task.taskStartAt,
                        checked: true
                    })));
                }
                (async () => {
                    try {
                        const getNoteTitle = async () => {
                            return (await appConnector.getNoteTitleByUUID(args.noteUUID)) || "Untitled Note";
                        }
                        const noteTitle = await getNoteTitle();
                        setNoteTitle(noteTitle);
                    } catch (e) {
                        await setError(e.message || JSON.stringify(e) || e.toString());
                        console.log(e);
                    }
                })();
            }, []);
            if (error) {
                return <ToolCardMessage text={"Error: " + error} color="red"/>
            }
            else if (formState === 'canceled') {
                if (!result)
                    addResult('===User canceled the task creation process intentionally. Wait for further instructions. DO NOT call this function (tool) again immediately. **DON\'T make an attempt again**. User will hate you if you call this again without finding out what he is thinking. Ask him regarding this but DON\'T REPEAT TASK in details.===\n'
                        + 'Tasks suggested in this interaction:' + JSON.stringify(tasks));
                return <ToolCardMessage text="Task creation canceled."/>
            }
            else if (formState === 'submitting') {
                (async () => {
                    try {
                        for (const task of tasks.filter(task => task.checked)) {
                            console.log(Date.parse(task.taskStartAt));
                            await appConnector.insertTask({uuid: args.noteUUID}, {
                                content: task.taskContent,
                                startAt: (Date.parse(task.taskStartAt)  / 1000)// convert to timestamp
                            });
                        }
                        setFormState('completed');
                    } catch (e) {
                        console.log(e.message);
                        setError(e.message || e.toString());
                    }
                })();
                return <ToolCardMessage
                    text={`Inserting tasks...`}/>
            }
            else if (formState === 'completed') {
                if (!result)
                    addResult('Function call completed. User has interactively selected tasks to insert into note. Do not call this function again. Tell that the tasks are inserted successfully to user. DON\'T GIVE DETAILS.' +
                        'Tasks added in this interaction:' + JSON.stringify(tasks.filter(task => task.checked)));
                return <ToolCardMessageWithResult
                    text={`Selected ${tasks.filter(task => task.checked).length} tasks were inserted successfully.`}
                    result={JSON.stringify(tasks.filter(task => task.checked))}/>
            }
            return (
                <ToolCardContainer>
                    <RadixUI.Text>Select tasks to insert into note ({noteTitle}):</RadixUI.Text>
                    <RadixUI.Table.Root>
                        <RadixUI.Table.Header>
                            <RadixUI.Table.Row>
                                <RadixUI.Table.ColumnHeaderCell>Checkbox</RadixUI.Table.ColumnHeaderCell>
                                <RadixUI.Table.ColumnHeaderCell>Task Content</RadixUI.Table.ColumnHeaderCell>
                                <RadixUI.Table.ColumnHeaderCell>Start At</RadixUI.Table.ColumnHeaderCell>
                            </RadixUI.Table.Row>
                        </RadixUI.Table.Header>
                        <RadixUI.Table.Body>
                            {tasks.map((task, index) => (
                                <RadixUI.Table.Row key={index}>
                                    <RadixUI.Table.RowHeaderCell>
                                        <RadixUI.Checkbox
                                            checked={task.checked}
                                            onCheckedChange={(checked) => {
                                                const newTasks = [...tasks];
                                                newTasks[index].checked = checked;
                                                setTasks(newTasks);
                                            }}
                                        />
                                    </RadixUI.Table.RowHeaderCell>
                                    <RadixUI.Table.Cell>{task.taskContent}</RadixUI.Table.Cell>
                                    <RadixUI.Table.Cell>{task.taskStartAt}</RadixUI.Table.Cell>
                                </RadixUI.Table.Row>
                            ))}
                        </RadixUI.Table.Body>
                    </RadixUI.Table.Root>
                    <div style={{marginTop: '10px', display: 'flex', justifyContent: 'flex-end'}}>
                        <RadixUI.Button color="red"
                                        disabled={status === 'requires-action'}
                                        onClick={() => {
                                            setFormState('canceled');
                                        }}
                                        style={{marginRight: '10px'}}
                        >
                            Cancel
                        </RadixUI.Button>
                        <RadixUI.Button
                            disabled={status === 'requires-action'}
                            onClick={() => {
                                setFormState('submitting');
                            }}
                        >
                            Insert Selected Tasks
                        </RadixUI.Button>
                    </div>
                </ToolCardContainer>
            );
        }),
    });
}