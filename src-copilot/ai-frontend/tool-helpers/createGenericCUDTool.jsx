import { ToolCardMessage } from "../components/ToolCardMessage.jsx";
import {useGenericToolFormState} from "../hooks/useGenericToolFormState.jsx";
import {errorToString} from "../utils/errorToString.js";
import {useGenericToolParameters} from "../hooks/useGenericToolParameters.jsx";

/**
 * A generic function to create tools that allow user to perform create, update, or delete (cud) operations.
 */
export const createGenericCUDTool = ({
                                                 toolName,
                                                 description,
                                                 parameters,
                                                 triggerCondition,
                                                 onInit = ({setFormState}) => {},
                                                 onCompleted = () => {},
                                                 onSubmitted = () => {},
                                                 onCanceled = ({addResult, args, cancelFurtherLLMReply}) => {
                                                     addResult(`Tool invocation canceled by user. No operation was performed. Wait for further instructions. User will hate you if you call this again without finding out what they are thinking.
                                                     Input (canceled): ${JSON.stringify(args)}`);
                                                     cancelFurtherLLMReply();
                                                 },
                                                 onError = ({formError, addResult}) => {
                                                     addResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
                                                 },
                                                 renderWaitingForUserInput = () => {},
                                                 renderSubmitting = () => {
                                                     return <ToolCardMessage text={`Processing...`} />
                                                 },
                                                 renderCanceled = () => {
                                                    return <ToolCardMessage text={`Tool invocation canceled.`} />
                                                 },
                                                 renderCompleted = () => {},
                                                 renderError = ({formError}) => {
                                                     return <ToolCardMessage text={"Error: " + errorToString(formError)} color="red" />
                                                 },
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({ args, status, result, addResult }) => {
            const allParameters = useGenericToolParameters({args, status, result, addResult});

            const [formState, setFormState, formRender] = useGenericToolFormState({
                init: {
                    eventHandler: onInit,
                    renderer: null,
                },
                waitingForUserInput: {
                    eventHandler: null,
                    renderer: renderWaitingForUserInput
                },
                submitted: {
                    eventHandler: onSubmitted,
                    renderer: renderSubmitting
                },
                completed: {
                    eventHandler: onCompleted,
                    renderer: renderCompleted
                },
                canceled: {
                    eventHandler: onCanceled,
                    renderer: renderCanceled
                },
                error: {
                    eventHandler: onError,
                    renderer: renderError
                }
            }, 'init', allParameters);

            return formRender ? React.createElement(formRender, {...allParameters, formState, setFormState}) : null;
        }
    });
}