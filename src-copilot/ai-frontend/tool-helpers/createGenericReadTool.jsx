import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import { capitalize } from "lodash-es";

export const createGenericReadTool = ({
    toolName,
    description,
    parameters,
    triggerCondition,
    itemName,
    onInitFunction = () => {}
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({args, result, addResult, status}) => {
            const [formState, setFormState] = React.useState("loading");
            const [formError, setFormError] = React.useState(null);
            const [initResult, setInitResult] = React.useState(null);
            const threadRuntime = AssistantUI.useThreadRuntime();

            // == On init ==
            React.useEffect(() => {
                const initialize = async () => {
                    try {
                        const response = await onInitFunction({args, threadRuntime});
                        setInitResult(response);
                        setFormState("completed");
                    }
                    catch (e) {
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
                    addResult(`Error encountered during tool execution: ${formErrorMessage}\nInput: ${JSON.stringify(args)}`);
                }
                else if (formState === "completed") {
                    if (!result) {
                        addResult(
                            `Function call completed successfully. ` +
                            (typeof initResult === "object" && Array.isArray(initResult) ? `Found ${initResult.length} ${itemName}.\n` : '\n') +
                            `Input: ${JSON.stringify(args)}\n` +
                            `Output: ${JSON.stringify(initResult)}`
                        );
                    }
                }
            }, [formState]);

            // ===== Render UI =====
            if (formError) {
                const errorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                return <ToolCardMessage text={"Error: " + errorMessage} color="red"/>
            }
            else if (formState === "loading") {
                return <ToolCardMessage text={`Looking for ${itemName}...`}/>
            }
            else if (formState === "completed") {
                return (
                    <ToolCardMessageWithResult
                        text={`${capitalize(itemName)} search completed. Found ${initResult.length} items.`}
                        result={result || JSON.stringify(initResult)}
                    />
                );
            }

            return null;
        }
    });
};