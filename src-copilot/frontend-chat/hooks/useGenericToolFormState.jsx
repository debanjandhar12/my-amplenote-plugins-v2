import { set, get, cloneDeep } from "lodash-es";
import { errorToString } from "../helpers/errorToString.js";
import { ToolCardErrorMessage } from "../components/tools-ui/ToolCardErrorMessage.jsx";

/**
 * This hook is used to manage the state of a generic tool form.
 * booting, init, completed, error are mandatory special states. canceled is optional special state.
 * Other than the above states, there can be any number of intermediate states.
 */
export const useGenericToolFormState = (states, params = {}) => {
    // --- Validations ---
    if (!states || typeof states !== 'object') {
        throw new Error('useGenericToolFormState: states must be an object');
    }
    const stateNames = Object.keys(states);
    if (!stateNames.includes('error') || !stateNames.includes('init') || !stateNames.includes('completed') || !stateNames.includes('booting')) {
        throw new Error('useGenericToolFormState: states must have error, init, completed, and booting states');
    }
    if (states?.booting.eventHandler || states.error?.eventHandler || states.canceled?.eventHandler) {
        throw new Error('useGenericToolFormState: states.booting, states.error, and states.canceled must not have eventHandlers');
    }

    // --- State and Renderer ---
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
    const threadRuntime = AssistantUI.useThreadRuntime();

    // Use a ref to ensure the error/cancel cleanup logic runs only once.
    const cleanupHasRun = React.useRef(false);

    // --- State Initialization and Restoration from Chat History ---
    React.useEffect(() => {
        if (formState) return;
        if (params.status.type === 'running') return;

        const toolStateInChatHistory = get(message, `metadata.custom.toolStateStorage.${toolCallId}`);
        if (toolStateInChatHistory && toolStateInChatHistory.formState) {
            setFormState(toolStateInChatHistory.formState);
            params.setFormData(toolStateInChatHistory.formData);
            params.setFormError(toolStateInChatHistory.formError);
            if (toolStateInChatHistory.formState === 'error' || toolStateInChatHistory.formState === 'canceled') {
                cleanupHasRun.current = true;
            }
        } else {
            setFormState('booting');
        }
    }, [params.args, params.status, message]);

    // --- Sync state with message metadata for chat history ---
    const { formData, formError } = params;
    React.useEffect(() => {
        if (!formState) return;
        set(message, `metadata.custom.toolStateStorage.${toolCallId}`, {
            formState: formState,
            formData: formData,
            formError: formError
        });
    }, [formState, formData, formError, message]);

    // --- Handle booting -> init transition ---
    React.useEffect(() => {
        if (formState !== 'booting') return;

        const handleBootingToInit = () => {
            const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
            const toolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

            let allPreviousToolsCompleted = true;
            for (let i = 0; i < toolIndex; i++) {
                const prevToolId = allToolCalls[i].toolCallId;
                const prevToolState = get(message, `metadata.custom.toolStateStorage.${prevToolId}`);
                if (prevToolState?.formState !== 'completed' && prevToolState?.formState !== 'error') {
                    allPreviousToolsCompleted = false;
                    break;
                }
            }

            if (allPreviousToolsCompleted) {
                setFormState('init');
            }
        };

        window.addEventListener('onToolStateChangeComplete', handleBootingToInit);  // listen to other tools states for metadata updates
        handleBootingToInit();

        return () => {
            window.removeEventListener('onToolStateChangeComplete', handleBootingToInit);
        };
    }, [formState, message]);

    // --- Core State Machine Logic ---
    React.useEffect(() => {
        if (!formState || params.result) return;

        (async () => {
            window.dispatchEvent(new CustomEvent('onToolStateChange', { detail: formState }));
            console.log('onToolStateChange', params.toolCallId, formState);

            try {
                // --- Logic for error or cancel side effects (removal of subsequent tools) ---
                if ((formState === 'error' || formState === 'canceled') && !cleanupHasRun.current) {
                    cleanupHasRun.current = true; // Set lock immediately

                    const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
                    const currentToolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

                    if (currentToolIndex !== -1) {
                        const subsequentToolCalls = allToolCalls.slice(currentToolIndex + 1);
                        if (subsequentToolCalls.length > 0) {
                            const modifiedMessage = cloneDeep(message);
                            modifiedMessage.content = modifiedMessage.content.filter(c =>
                                c.type !== 'tool-call' || !subsequentToolCalls.some(stc => stc.toolCallId === c.toolCallId)
                            );
                            if (modifiedMessage.metadata?.custom?.toolStateStorage) {
                                subsequentToolCalls.forEach(stc => delete modifiedMessage.metadata.custom.toolStateStorage[stc.toolCallId]);
                            }
                            const threadState = threadRuntime.export();
                            const modifiedMessages = threadState.messages.map(msgWrapper =>
                                msgWrapper.message.id === message.id ? { ...msgWrapper, message: modifiedMessage } : msgWrapper
                            );
                            threadRuntime.import({ ...threadState, messages: modifiedMessages });
                            console.log('Removed subsequent tool calls for tool call', toolCallId);
                        }
                    }

                    // For errored tools, we must call addResult AGAIN after cleanup
                    // to force AssistantUI to re-evaluate and trigger the LLM call.
                    if (formState === 'error') {
                        threadRuntime.getMesssageById(message.id).getContentPartByToolCallId(toolCallId).addToolResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
                    }
                }

                // --- Run the event handler for the current state ---
                if (states[formState]?.eventHandler) {
                    await states[formState].eventHandler({ ...params, formState, setFormState });
                }

                window.dispatchEvent(new CustomEvent('onToolStateChangeComplete', { detail: formState }));
                console.log('onToolStateChangeComplete', params.toolCallId, formState);

            } catch (e) {
                console.error(e);
                params.setFormError(e);
            }
        })();
    }, [formState, threadRuntime]);

    // --- Change state and add the INITIAL result when a form error occurs ---
    React.useEffect(() => {
        if (params.formError && formState !== "error") {
            params.addResult(`Error: ${errorToString(params.formError)}. Tool invocation failed.`);
            setFormState("error");
        }
    }, [params.formError]);

    // --- Handle Canceled change state ---
    React.useEffect(() => {
        if (formState === "canceled") {
            params.addResult("Tool invocation canceled by user. Please do not try again immediately.");
        }
    }, [formState]);

    return [formState, setFormState, render];
};