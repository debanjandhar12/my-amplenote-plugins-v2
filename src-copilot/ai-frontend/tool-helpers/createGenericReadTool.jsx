import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {useGenericToolFormState} from "../hooks/useGenericToolFormState.jsx";
import {errorToString} from "../utils/errorToString.js";
import {useGenericToolParameters} from "../hooks/useGenericToolParameters.jsx";

export const createGenericReadTool = ({
                                          toolName,
                                          description,
                                          parameters,
                                          triggerCondition,
                                          onInit = ({setFormState}) => {},
                                          onCompleted = () => {},
                                          onError = ({formError, addResult, args}) => {
                                              addResult(`Error: ${errorToString(formError)}. Tool invocation failed. Input: ${JSON.stringify(args)}`);
                                          },
                                          renderInit = () => {
                                              const { Spinner } = window.RadixUI;
                                              return <ToolCardMessage text={`Processing...`} icon={<Spinner />} />
                                          },
                                          renderCompleted = () => {},
                                          renderError = ({formError}) => {
                                              const { ExclamationCircleIcon } = window.RadixIcons;
                                              return <ToolCardMessage text={"Error: " + errorToString(formError)} color="red" icon={<ExclamationCircleIcon />} />
                                          },
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({args, result, addResult, status}) => {
            const allParameters = useGenericToolParameters({args, status, result, addResult});

            const [formState, setFormState, formRender] = useGenericToolFormState({
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