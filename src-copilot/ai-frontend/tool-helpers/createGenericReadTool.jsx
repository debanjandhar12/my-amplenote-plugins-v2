import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {useToolFormState} from "../hooks/useToolFormState.jsx";

export const createGenericReadTool = ({
                                          toolName,
                                          description,
                                          parameters,
                                          triggerCondition,
                                          onInit = ({setFormState}) => {},
                                          onCompleted = () => {},
                                          onError = ({formError, addResult, args}) => {
                                              const errorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                                              addResult(`Error: ${errorMessage}. Tool invocation failed. Input: ${JSON.stringify(args)}`);
                                          },
                                          renderInit = () => {
                                              return <ToolCardMessage text="Processing..."/>
                                          },
                                          renderCompleted = () => {},
                                          renderError = ({formError}) => {
                                              const errorMessage = formError.message || JSON.stringify(formError) || formError.toString();
                                              return <ToolCardMessage text={"Error: " + errorMessage} color="red"/>
                                          },
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({args, result, addResult, status}) => {
            const threadRuntime = AssistantUI.useThreadRuntime();
            const [formData, setFormData] = React.useState({});
            const [formError, setFormError] = React.useState(null);
            const cancelFurtherLLMReply = () => {threadRuntime.cancelRun();};
            const allParameters = {args, status, result, addResult, formError, setFormError,
                formData, setFormData, cancelFurtherLLMReply};
            const [formState, setFormState, formRender] = useToolFormState({
                init: {
                    eventHandler: onInit,
                    renderer: renderInit
                },
                completed: {
                    eventHandler: onCompleted,
                    renderer: renderCompleted
                },
                error: {
                    eventHandler: onError,
                    renderer: renderError
                }
            }, 'init', allParameters);

            return formRender ? React.createElement(formRender, {...allParameters, formState, setFormState}) : null;
        }
    });
};