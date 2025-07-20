import { set, get, cloneDeep } from "lodash-es";
import { errorToString } from "../helpers/errorToString.js";
import { ToolCardErrorMessage } from "../components/tools-ui/ToolCardErrorMessage.jsx";

export const useGenericToolFormState = (states, params = {}) => {
    // --- Validations ---
    const stateNames = Object.keys(states);
    if (!stateNames.includes('error') || !stateNames.includes('init') || !stateNames.includes('completed') || !stateNames.includes('booting')) {
        throw new Error('states must have error, init, completed, and booting states');
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

    // This ref is the key to preventing the infinite loop on cleanup.
    const cleanupHasRun = React.useRef(false);

    // --- State Initialization and Restoration ---
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

    // --- Sync state with message metadata ---
    const { formData, formError } = params;
    React.useEffect(() => {
        if (!formState) return;
        set(message, `metadata.custom.toolStateStorage.${toolCallId}`, {
            formState: formState,
            formData: formData,
            formError: formError
        });
    }, [formState, formData, formError, message]);

    // --- This effect *only* transitions to the 'error' state ---
    // The actual side effects are handled by the main state machine below.
    React.useEffect(() => {
        if (params.formError && formState !== 'error') {
            setFormState("error");
        }
    }, [params.formError]);

    // --- Main State Machine Event Handler ---
    React.useEffect(() => {
        if (!formState || params.result) return;

        const handleStateChange = async () => {
            try {
                // --- Logic for booting -> init transition ---
                if (formState === 'booting') {
                    const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
                    const toolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

                    let allPreviousToolsCompleted = true;
                    for (let i = 0; i < toolIndex; i++) {
                        const prevToolId = allToolCalls[i].toolCallId;
                        const prevToolState = get(message, `metadata.custom.toolStateStorage.${prevToolId}`);
                        // A previous tool is "done" if it's completed
                        if (prevToolState?.formState !== 'completed') {
                            allPreviousToolsCompleted = false;
                            break;
                        }
                    }

                    if (allPreviousToolsCompleted) {
                        setFormState('init');
                    }
                    return;
                }

                // --- Logic for error or cancel side effects (subsequent tool removal) ---
                if (formState === 'error' || formState === 'canceled') {
                    if (cleanupHasRun.current) return; // The crucial guard
                    cleanupHasRun.current = true;      // Set the lock immediately

                    console.log(`Starting one-time cleanup for ${formState} tool:`, toolCallId);

                    const allToolCalls = message.content?.filter(c => c.type === 'tool-call') || [];
                    const currentToolIndex = allToolCalls.findIndex(tc => tc.toolCallId === toolCallId);

                    if (currentToolIndex === -1) return;

                    const subsequentToolCalls = allToolCalls.slice(currentToolIndex + 1);

                    if (subsequentToolCalls.length > 0) {
                        // Perform the message modification and re-import
                        const modifiedMessage = cloneDeep(message);
                        modifiedMessage.content = modifiedMessage.content.filter(c =>
                            c.type !== 'tool-call' || !subsequentToolCalls.some(stc => stc.toolCallId === c.toolCallId)
                        );
                        if (modifiedMessage.metadata?.custom?.toolStateStorage) {
                            subsequentToolCalls.forEach(stc => {
                                delete modifiedMessage.metadata.custom.toolStateStorage[stc.toolCallId];
                            });
                        }
                        const threadState = threadRuntime.export();
                        const modifiedMessages = threadState.messages.map(msgWrapper =>
                            msgWrapper.message.id === message.id ? { ...msgWrapper, message: modifiedMessage } : msgWrapper
                        );
                        threadRuntime.import({ ...threadState, messages: modifiedMessages });
                        console.log('Removed subsequent tool calls for:', toolCallId);
                    }

                    // **** THIS IS THE RESTORED LOGIC ****
                    // After cleanup, if the state was 'error', add the tool result.
                    // This is the final step that signals completion to the system.
                    if (formState === 'error') {
                        console.log('Adding error result for tool:', toolCallId);
                        params.addResult(`Error: ${errorToString(formError)}. Tool invocation failed.`);
                    }
                    return; // Stop execution for this state
                }

                // --- Generic event handler for user-defined states ---
                if (states[formState]?.eventHandler) {
                    await states[formState].eventHandler({ ...params, formState, setFormState });
                }

            } catch (e) {
                console.error("Error during state handling:", e);
                // If any part of the state handler throws, set the error state.
                // This will trigger the error flow on the next render.
                params.setFormError(e);
            }
        };

        handleStateChange();

    }, [formState, message, threadRuntime]); // Effect dependencies

    return [formState, setFormState, render];
};