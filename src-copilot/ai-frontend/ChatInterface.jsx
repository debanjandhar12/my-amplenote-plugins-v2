import {convertUIToolsToDummyServerTools} from "../ai-backend/utils/convertUIToolsToDummyServerTools.js";
import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./CustomComposer.jsx";
import {CUSTOM_LLM_AVATAR_SETTING, CUSTOM_LLM_INSTRUCTION_SETTING} from "../constants.js";
import {ChatInterfaceHeader} from "./ChatInterfaceHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelConfig} from "./hooks/useModelConfig.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    const thread = AssistantUI.useThread();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions(thread);

    // Based on user data, initialize assistant-ui chat
    React.useEffect(() => {
        if (window.userData.invokerImageSrc) {
            fetch(window.userData.invokerImageSrc)
                .then(response => response.blob())
                .then(async blob => {
                    const file = new File([blob], "image.jpg", { type: "image/jpeg" });
                    await threadRuntime.composer.addAttachment(file);
                });
        }
    }, []);

    // Handle tools and system prompt dynamically by setting model config
    window.appConnector.getUserCurrentNoteData().then(async (userData) => {
        window.userData = {...window.userData, ...userData};    // update userData
    });
    useModelConfig(runtime);
    const { Thread } = window.AssistantUI;
    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <ChatInterfaceHeader />
            <Thread
                welcome={{
                    suggestions: suggestions,
                }}
                assistantMessage={{ components: { Text: AssistantUIMarkdown } }}
                assistantAvatar={assistantAvatar}
                tools={window.ALL_TOOLS}
                components={{
                    Composer: CustomComposer
                }}
            />
        </div>
    )
}