import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./components/CustomComposer.jsx";
import {ChatAppHeader} from "./ChatAppHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelContext} from "./hooks/useModelContext.jsx";
import {UserMessage} from "./components/UserMessage.jsx";
import {ToolRegistry} from "./tools-core/registry/ToolRegistry.js";
import {useAmplenoteAttachments} from "./hooks/useAmplenoteAttachments.jsx";
import {useCustomChatHistoryManager} from "./components/RemoteAssistantRuntimeProvider.jsx";
import {useUserDataPolling} from "./hooks/useUserDataPolling.jsx";
import {useIntervalPingPlugin} from "./hooks/useIntervalPingPlugin.jsx";

export const ChatAppWindow = () => {
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions();

    useModelContext();
    useAmplenoteAttachments();
    useCustomChatHistoryManager();
    useUserDataPolling();
    useIntervalPingPlugin();

    const { Thread } = window.AssistantUI;
    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <ChatAppHeader />
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