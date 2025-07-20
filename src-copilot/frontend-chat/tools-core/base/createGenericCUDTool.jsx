import { ToolCardMessage } from "../../components/tools-ui/ToolCardMessage.jsx";
import {useGenericToolFormState} from "../../hooks/useGenericToolFormState.jsx";
import {errorToString} from "../../helpers/errorToString.js";
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
                                                 category,
                                                 onInit = ({setFormState}) => {
                                                    setFormState('waitingForUserInput');
                                                 },
                                                 onCompleted = () => {},
                                                 onSubmitted = () => {},
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
    const tool = AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        triggerCondition,
        render: ({ args, status, result, addResult, toolCallId }) => {
            const allParameters = useGenericToolParameters({
                toolName, toolCallId, description, parameters,
                args, status, result, addResult});

            const [formState, setFormState, formRender] = useGenericToolFormState({
                booting: {
                    eventHandler: null,
                    renderer: () => null
                },
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
                    eventHandler: null,
                    renderer: renderCanceled
                },
                error: {
                    eventHandler: null,
                    renderer: renderError
                }
            }, allParameters);

            return formRender ? formRender({...allParameters, formState, setFormState}) : null;
        }
    });
    
    // Add category property to the tool
    if (category) {
        tool.unstable_tool.category = category;
    }
    
    return tool;
}
