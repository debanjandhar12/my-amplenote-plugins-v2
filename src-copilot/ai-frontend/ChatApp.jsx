import {useDangerousInBrowserRuntimeMod} from "./utils/useDangerousInBrowserRuntimeMod.js";
import {LLM_MAX_TOKENS_DEFAULT, LLM_MAX_TOKENS_SETTING} from "../constants.js";
import {errorToString} from "./utils/errorToString.js";
import {ChatInterface} from "./ChatInterface.jsx";

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
        onFinish: async (threadRuntime) => {
            console.log('onFinish', threadRuntime);
        },
        onError: async (threadRuntime, error) => {
            appConnector.alert(`Error: ${errorToString(error)}`);
        }
    });
    const {Theme} = window.RadixUI;
    const {AssistantRuntimeProvider} = window.AssistantUI;
    return (
        <Theme appearance="dark" accentColor="blue">
            <AssistantRuntimeProvider runtime={runtime}>
                <ChatInterface />
            </AssistantRuntimeProvider>
        </Theme>
    )
}