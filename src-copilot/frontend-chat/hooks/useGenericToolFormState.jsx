import {set,get} from "lodash-es";
import {errorToString} from "../tools-core/utils/errorToString.js";
import {ToolCardErrorMessage} from "../components/tools-ui/ToolCardErrorMessage.jsx";

export const useGenericToolFormState = (states, params = {}) => {
    const [formState, setFormState] = React.useState();
    const render = (props) => {
        const { ErrorBoundary } = window.ReactErrorBoundary;
        const originalRender = states[formState]?.renderer || (() => null);
        return (
            <ErrorBoundary fallbackRender={(e) => <ToolCardErrorMessage toolName={params.toolName} input={params.args}
                text={"Unhandled Error occurred: " + errorToString(e)} color="red" />}>
                {originalRender ? React.createElement(originalRender, props) : null}
            </ErrorBoundary>
        );
    };
    const toolCallId = params.toolCallId;
    const message = AssistantUI.useMessage();

    React.useEffect(() => {
        if (formState) return;
        if (params.status.type === 'running') return;   // wait for args to be completed from llm
        const toolStateInChatHistory = get(message, `metadata.custom.toolStateStorage.${toolCallId}`);
        if (toolStateInChatHistory && toolStateInChatHistory.formState) {
            // Restore formState, formData, and formError from message.metadata.custom.toolStateStorage (called when restored from chat history)
            setFormState(toolStateInChatHistory.formState);
            params.setFormData(toolStateInChatHistory.formData);
            params.setFormError(toolStateInChatHistory.formError);
        } else {
            setFormState(Object.keys(states)[0]);   // Initialize formState to the first state
        }
    }, [params.args, params.status]);

    // Sync formState, formData, and formError with message.metadata.custom.toolStateStorage for maintaining chat history
    const {formData, formError} = params;
    React.useEffect(() => {
        if (!formState) return;
        set(message, `metadata.custom.toolStateStorage.${toolCallId}`, {
                formState: formState,
                formData: formData,
                formError: formError
        });
    }, [formState, formData, formError]);

    // Call event handler on state change
    React.useEffect(() => {
        if (!formState) return;
        if (!params.result && states[formState].eventHandler) {   // only run if result is not already set
            (async () => {
                try {
                    window.dispatchEvent(new CustomEvent('onToolStateChange', {detail: formState}));
                    console.log('onToolStateChange', formState);
                    await states[formState].eventHandler({...params, formState, setFormState});
                } catch (e) {
                    console.error(e);
                    params.setFormError(e);
                }
            })();
        }
    }, [formState]);

    // Change state when form error occurs
    React.useEffect(() => {
        if (params.formError && states['error']) {
            setFormState("error");
        }
    }, [params.formError]);

    return [formState, setFormState, render];
}
