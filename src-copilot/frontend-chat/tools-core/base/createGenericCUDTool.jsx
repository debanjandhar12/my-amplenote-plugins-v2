import { ToolCardMessage } from "../../components/tools-ui/ToolCardMessage.jsx";
import {useGenericToolFormState} from "../../hooks/useGenericToolFormState.jsx";
import {errorToString} from "../utils/errorToString.js";
import {useGenericToolParameters} from "../../hooks/useGenericToolParameters.jsx";
import {ToolCardErrorMessage} from "../../components/tools-ui/ToolCardErrorMessage.jsx";
import {ToolCardCanceledMessage} from "../../components/tools-ui/ToolCardCanceledMessage.jsx";

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
                                                     addResult("Tool invocation canceled by user. No operation was performed.\n"+
                                                     `Input (canceled): ${JSON.stringify(args)}`);
                                                     cancelFurtherLLMReply();
                                                 },
                                                 onError = ({formError, addResult}) => {
                                                     addResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
                                                 },
                                                 renderWaitingForUserInput = () => {},
                                                 renderInit = () => {
                                                     const { Spinner } = window.RadixUI;
                                                     return <ToolCardMessage text={`Initializing...`} icon={<Spinner />} />
                                                 },
                                                 renderSubmitting = () => {
                                                     const { Spinner } = window.RadixUI;
                                                     return <ToolCardMessage text={`Processing...`} icon={<Spinner />} />
                                                 },
                                                 renderCanceled = ({args}) => {
                                                     return <ToolCardCanceledMessage text={`${toolName} tool invocation canceled.`} 
                                                        toolName={toolName} input={args} />
                                                 },
                                                 renderCompleted = () => {},
                                                 renderError = ({formError, toolName, args}) => {
                                                     return <ToolCardErrorMessage toolName={toolName} input={args}
                                                         text={"Error: " + errorToString(formError)} color="red" />
                                                 },
}) => {
    return AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({ args, status, result, addResult, toolCallId }) => {
            const allParameters = useGenericToolParameters({
                toolName, toolCallId, description, parameters,
                args, status, result, addResult});

            const [formState, setFormState, formRender] = useGenericToolFormState({
                init: {
                    eventHandler: onInit,
                    renderer: renderInit,
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
            }, allParameters);

            return formRender ? formRender({...allParameters, formState, setFormState}) : null;
        }
    });
}
