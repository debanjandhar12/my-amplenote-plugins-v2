import { ToolCardMessage } from "../components/ToolCardMessage.jsx";
import {useToolFormState} from "../hooks/useToolFormState.jsx";
import {errorToString} from "../utils/errorToString.js";

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
            const threadRuntime = AssistantUI.useThreadRuntime();
            const [formData, setFormData] = React.useState({});
            const [formError, setFormError] = React.useState(null);
            const cancelFurtherLLMReply = () => {threadRuntime.cancelRun();};
            const allParameters = {args, status, result, addResult, formError, setFormError,
                formData, setFormData, cancelFurtherLLMReply};
            const [formState, setFormState, formRender] = useToolFormState({
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