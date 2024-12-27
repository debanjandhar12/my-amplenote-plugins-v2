import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./components/CustomComposer.jsx";
import {ChatInterfaceHeader} from "./components/ChatInterfaceHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelConfig} from "./hooks/useModelConfig.jsx";
import {UserMessage} from "./components/UserMessage.jsx";
import {ToolRegistry} from "./tools-core/registry/ToolRegistry.js";
import {getCorsBypassUrl} from "../../common-utils/cors-helpers.js";
import {useInitAttachments} from "./hooks/useInitAttachments.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    const thread = AssistantUI.useThread();
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions(thread);

    // Based on user data, initialize assistant-ui attachments
    useInitAttachments();

    // Handle tools and system prompt dynamically by setting model config
    React.useEffect(() => {
        const updateUserData = async () => {
            window.appConnector.getUserCurrentNoteData().then(async (userData) => {
                window.userData = {...window.userData, ...userData};    // update userData
            });
        }
        updateUserData();
        const intervalId = setInterval(() => updateUserData(), 4000);
        const unsubscribe = runtime.thread.subscribe(() => updateUserData());
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        }
    }, [runtime]);
    useModelConfig(runtime);
    const { Thread } = window.AssistantUI;
    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <ChatInterfaceHeader />
            <Thread
                welcome={{
                    suggestions: suggestions,
                }}
                assistantMessage={{ components: { Text: AssistantUIMarkdownComponent } }}
                assistantAvatar={assistantAvatar}
                tools={ToolRegistry.getAllTools()}
                components={{
                    Composer: CustomComposer,
                    UserMessage: UserMessage
                }}
            />
        </div>
    )
}