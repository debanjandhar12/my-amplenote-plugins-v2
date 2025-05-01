import {useCustomDangerousInBrowserRuntime} from "./useCustomDangerousInBrowserRuntime.jsx";
import {LLM_MAX_TOKENS_SETTING} from "../../constants.js";
import {AmplenoteAttachmentAdapter} from "../components/AmplenoteAttachmentAdapter.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";

export const useInnerRuntime = () => {
    const runtime = useCustomDangerousInBrowserRuntime({
        model: window.LLM_MODEL,
        maxSteps: 4,
        ...(
            !isNaN(parseInt(appSettings[LLM_MAX_TOKENS_SETTING], 10)) && {
                maxTokens: parseInt(appSettings[LLM_MAX_TOKENS_SETTING], 10)
            }
        ),
        adapters: {
            attachments: new AssistantUI.CompositeAttachmentAdapter([
                new AssistantUI.SimpleImageAttachmentAdapter(),
                new AssistantUI.SimpleTextAttachmentAdapter(),
                new AmplenoteAttachmentAdapter()
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

    return runtime;
}