import { set, get, cloneDeep } from "lodash-es";
import { errorToString } from "../helpers/errorToString.js";
import { ToolCardErrorMessage } from "../components/tools-ui/ToolCardErrorMessage.jsx";

export const useGenericToolFormState = (states, params = {}) => {
    // Validations
    const stateNames = Object.keys(states);
    if (!stateNames.includes('error') || !stateNames.includes('init') || !stateNames.includes('completed') || !stateNames.includes('booting')) {
        throw new Error('states must have error, init, completed, and booting states');
    }

    // Tools renderer
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

    // Handle restoring from chat history and initializing empty tools to booting state
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
            setFormState('booting'); // initialize to booting state
        }
    }, [params.args, params.status]);

    // Sync formState, formData, and formError with message.metadata.custom.toolStateStorage for maintaining chat history
    const { formData, formError } = params;
    React.useEffect(() => {
        if (!formState) return;
        set(message, `metadata.custom.toolStateStorage.${toolCallId}`, {
            formState: formState,
            formData: formData,
            formError: formError
        });
    }, [formState, formData, formError]);

    // When previous tools complete, handle booting -> init transition
    React.useEffect(() => {
        const handleBootingToInit = () => {
            if (formState !== 'booting') return;
            const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
            console.log('allToolCalls for transition', message, allToolCalls);
            const toolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

            // Check if all previous tools have completed / errored
            let allPreviousToolsCompleted = true;
            for (let i = 0; i < toolIndex; i++) {
                const prevToolId = allToolCalls[i].toolCallId;
                const prevToolState = get(message, `metadata.custom.toolStateStorage.${prevToolId}`);
                if (prevToolState?.formState !== 'completed') {
                    allPreviousToolsCompleted = false;
                    break;
                }
            }

            if (allPreviousToolsCompleted) {
                setFormState('init');
            }
        }
        window.addEventListener('onToolStateChangeComplete', handleBootingToInit);
        handleBootingToInit();
        return () => {
            window.removeEventListener('onToolStateChangeComplete', handleBootingToInit);
        }
    }, [formState, message]);

    // When a tool error occurs or canceled, need to delete further tool calls
    const threadRuntime = AssistantUI.useThreadRuntime();
    React.useEffect(() => {
        const handleToolCanceledOrErrorCancelRun = () => {
            if (formState !== 'error' && formState !== 'canceled') return;
            const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
            const currentToolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

            if (currentToolIndex === -1) return; // Tool not found

            // Find all tool calls that come after the current errored/canceled tool
            const subsequentToolCalls = allToolCalls.slice(currentToolIndex + 1);

            if (subsequentToolCalls.length === 0) return;

            threadRuntime.cancelRun();
            console.log('Canceling run for tool call', toolCallId);
        }

        const handleToolCanceledOrErrorModifyMessage = () => {
            if (formState !== 'error') return;

            const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
            const currentToolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

            if (currentToolIndex === -1) return; // Tool not found

            // Find all tool calls that come after the current errored/canceled tool
            const subsequentToolCalls = allToolCalls.slice(currentToolIndex + 1);

            if (subsequentToolCalls.length === 0) return;

            // Create a modified message with subsequent tool calls content parts removed
            const modifiedMessage = cloneDeep(message);
            modifiedMessage.content = modifiedMessage.content.filter(c => {
                if (c.type !== 'tool-call') return true;
                return !subsequentToolCalls.some(stc => stc.toolCallId === c.toolCallId);
            });

            // Remove tool state storage for subsequent tools
            if (modifiedMessage.metadata?.custom?.toolStateStorage) {
                subsequentToolCalls.forEach(stc => {
                    delete modifiedMessage.metadata.custom.toolStateStorage[stc.toolCallId];
                });
            }

            // Export current thread state and rebuild with modified message
            const threadState = threadRuntime.export();
            const modifiedMessages = threadState.messages.map(msgWrapper => {
                if (msgWrapper.message.id === message.id) {
                    return { ...msgWrapper, message: modifiedMessage };
                }
                return msgWrapper;
            });

            // Import the modified thread state
            threadRuntime.import({
                ...threadState,
                messages: modifiedMessages
            });
            console.log('Removed subsequent tool calls for tool call', toolCallId);

            // For errored tools, we need to call llm again (addToolResult automatically calls llm)
            if (formState === 'error') {
                threadRuntime.getMesssageById(message.id).getContentPartByToolCallId(toolCallId).addToolResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
            }
        }
        handleToolCanceledOrErrorCancelRun();
        window.addEventListener('onToolStateChangeComplete', handleToolCanceledOrErrorModifyMessage);
        return () => {
            window.removeEventListener('onToolStateChangeComplete', handleToolCanceledOrErrorModifyMessage);
        }
    }, [formState, threadRuntime]);

    // Call event handler on state change
    React.useEffect(() => {
        if (!formState) return;
        window.dispatchEvent(new CustomEvent('onToolStateChange', { detail: formState }));
        console.log('onToolStateChange', params.toolCallId, formState);
        if (!params.result) {   // only run if result is not already set
            (async () => {
                try {
                    if (states[formState].eventHandler) {
                        await states[formState].eventHandler({ ...params, formState, setFormState });
                    }
                    window.dispatchEvent(new CustomEvent('onToolStateChangeComplete', { detail: formState }));
                    console.log('onToolStateChangeComplete', params.toolCallId, formState);
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
            params.addResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
            setFormState("error");
        }
    }, [params.formError]);

    return [formState, setFormState, render];
}
