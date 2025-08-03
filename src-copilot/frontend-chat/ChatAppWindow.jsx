import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./components/CustomComposer.jsx";
import {ChatAppHeader} from "./ChatAppHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelContext} from "./hooks/useModelContext.jsx";
import {UserMessage} from "./components/UserMessage.jsx";
import {useAmplenoteAttachments} from "./hooks/useAmplenoteAttachments.jsx";
import {useUserDataPolling} from "./hooks/useUserDataPolling.jsx";
import {useIntervalPingPlugin} from "./hooks/useIntervalPingPlugin.jsx";
import {getChatAppContext} from "./context/ChatAppContext.jsx";
import {ChatHistoryOverlay} from "./ChatHistoryOverlay.jsx";
import {useCustomChatHistoryManager} from "./hooks/useCustomChatHistoryManager.jsx";
import {CustomEditComposer} from "./components/CustomEditComposer.jsx";
import {CustomToolFallback} from "./tools/CustomToolFallback.jsx";

export const ChatAppWindow = () => {
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions();
    const { chatHistoryLoaded, isChatHistoryOverlayOpen, tools, initialAttachmentProcessed } = React.useContext(getChatAppContext());

    useModelContext();
    useAmplenoteAttachments();
    useCustomChatHistoryManager();
    useUserDataPolling();
    useIntervalPingPlugin();

    const { Thread } = window.AssistantUI;
    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            {
                chatHistoryLoaded && initialAttachmentProcessed && isChatHistoryOverlayOpen &&
                <ChatHistoryOverlay />
            }
            <ChatAppHeader />
            {
                chatHistoryLoaded && initialAttachmentProcessed &&
                    <Thread
                        welcome={{
                            suggestions: suggestions,
                        }}
                        assistantMessage={{components: {
                            Text: AssistantUIMarkdownComponent,
                            ToolFallback: CustomToolFallback
                        }}}
                        assistantAvatar={assistantAvatar}
                        tools={tools}
                        components={{
                            Composer: CustomComposer,
                            UserMessage: UserMessage,
                            EditComposer: CustomEditComposer,
                        }}
                    />
            }
        </div>
    )
}