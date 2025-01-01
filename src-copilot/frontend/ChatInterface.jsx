import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./components/CustomComposer.jsx";
import {ChatInterfaceHeader} from "./components/ChatInterfaceHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelConfig} from "./hooks/useModelConfig.jsx";
import {UserMessage} from "./components/UserMessage.jsx";
import {ToolRegistry} from "./tools-core/registry/ToolRegistry.js";
import {getCorsBypassUrl} from "../../common-utils/cors-helpers.js";
import {useAmplenoteAttachments} from "./hooks/useAmplenoteAttachments.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    const thread = AssistantUI.useThread();
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions(thread);

    // Send heartbeat signals to plugin
    React.useEffect(() => {
        const intervalId = setInterval(() => {
            window.appConnector.ping();
        }, 300);
        window.appConnector.ping();
        return () => clearInterval(intervalId);
    }, []);

    // Handle attachments, tools and system prompt dynamically by setting model config
    useAmplenoteAttachments();
    React.useEffect(() => {
        const updateUserData = async () => {
            window.appConnector.getUserCurrentNoteData().then(async (userData) => {
                window.userData = {...window.userData, ...userData};
            });
            window.appConnector.getUserDailyJotNote().then(async (userData) => {
                window.userData = {...window.userData, ...userData};
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