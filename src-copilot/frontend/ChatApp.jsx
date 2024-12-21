import {useDangerousInBrowserRuntimeMod} from "./hooks/useDangerousInBrowserRuntimeMod.jsx";
import {LLM_MAX_TOKENS_DEFAULT, LLM_MAX_TOKENS_SETTING} from "../constants.js";
import {errorToString} from "./tools-core/utils/errorToString.js";
import {ChatInterface} from "./ChatInterface.jsx";
import {ChatAppContextProvider} from "./context/ChatAppContext.jsx";

export const ChatApp = () => {
    // Setup runtime
    const runtime = useDangerousInBrowserRuntimeMod({
        model: window.LLM_MODEL,
        maxSteps: 4,
        maxTokens: appSettings[LLM_MAX_TOKENS_SETTING] || LLM_MAX_TOKENS_DEFAULT,
        adapters: {
            attachments: new AssistantUI.CompositeAttachmentAdapter([
                new AssistantUI.SimpleImageAttachmentAdapter()
            ]),
        },
        onFinish: async (result) => {
            window.dispatchEvent(new CustomEvent('onLLMCallFinish', {detail: result}));
            console.log('onLLMCallFinish', result);
        },
        onError: async (error) => {
            appConnector.alert(`Error: ${errorToString(error)}`);
        }
    });

    const {Theme} = window.RadixUI;
    const {AssistantRuntimeProvider} = window.AssistantUI;
    return (
        <ChatAppContextProvider>
            <Theme appearance="dark" accentColor="blue">
                <AssistantRuntimeProvider runtime={runtime}>
                    <ChatInterface />
                </AssistantRuntimeProvider>
            </Theme>
        </ChatAppContextProvider>
    )
}