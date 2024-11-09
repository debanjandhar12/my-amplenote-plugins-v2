import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";

export const createGenericReadTool = (
    {
        toolName, description, parameters,
        triggerCondition,
        itemName,
        onInitFunction = () => {}
    }
) => {
    return AssistantUI.makeAssistantToolUI({
        toolName: toolName,
        description: description,
        parameters: parameters,
        triggerCondition: triggerCondition,
        render: ({args, result, addResult, status}) => {
            const [formState, setFormState] = React.useState();
            const [formError, setFormError] = React.useState(null);
            const [initResult, setInitResult] = React.useState(null);

            // == On init ==
            React.useEffect(() => {
                (async () => {
                    try {
                        const r = await onInitFunction({args});
                        setInitResult(r);
                        setFormState('completed');
                    }
                    catch (e) {
                        setFormError(e);
                    }
                })();
            }, []);

            // == Handle result on formState changes ==
            React.useEffect(() => {
                if (formError) {
                    addResult(`Input: ${JSON.stringify(args)}\nError: ${formError.message || JSON.stringify(formError) || formError.toString()}`);
                }
                else if (formState === 'completed') {
                    if (!result)
                        addResult(`Function call completed successfully.\nInput: ${JSON.stringify(args)}\nOutput: ${JSON.stringify(initResult)}`);
                }
            }, [formState]);

            // ===== Render UI =====
            if (formError) {
                const errorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                return <ToolCardMessage text={"\nError: " + errorMessage} color="red"/>
            }
            else if (formState === 'pending') {
                return <ToolCardMessage text={`Looking for relevant ${itemName}...`}/>
            }
            else if (formState === 'completed') {
                return <ToolCardMessageWithResult result={result || ''} text={`Completed. Found ${initResult.length} ${itemName}.`}/>
            }
        }
    });
}