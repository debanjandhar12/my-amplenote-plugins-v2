import {useCustomDangerousInBrowserRuntime} from "./useCustomDangerousInBrowserRuntime.jsx";
import {LLM_MAX_STEPS, LLM_MAX_TOKENS_SETTING} from "../../constants.js";
import {AmplenoteAttachmentAdapter} from "../components/AmplenoteAttachmentAdapter.jsx";
import {errorToString} from "../helpers/errorToString.js";

export const useInnerRuntime = () => {
    const runtime = useCustomDangerousInBrowserRuntime({
        model: window.LLM_MODEL,
        maxSteps: LLM_MAX_STEPS,
        ...(
            appSettings[LLM_MAX_TOKENS_SETTING] &&
            String(appSettings[LLM_MAX_TOKENS_SETTING]).trim() !== '' &&
            Number(appSettings[LLM_MAX_TOKENS_SETTING]) !== 0 &&
            !isNaN(Number(appSettings[LLM_MAX_TOKENS_SETTING])) && {
                maxTokens: Number(appSettings[LLM_MAX_TOKENS_SETTING])
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