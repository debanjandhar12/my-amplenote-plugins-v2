import {useChatSuggestions} from "./hooks/useChatSuggestions.jsx";
import {CustomComposer} from "./components/CustomComposer.jsx";
import {ChatInterfaceHeader} from "./components/ChatInterfaceHeader.jsx";
import {useAssistantAvatar} from "./hooks/useAssistantAvatar.jsx";
import {useModelContext} from "./hooks/useModelContext.jsx";
import {UserMessage} from "./components/UserMessage.jsx";
import {ToolRegistry} from "./tools-core/registry/ToolRegistry.js";
import {useAmplenoteAttachments} from "./hooks/useAmplenoteAttachments.jsx";
import {useCustomChatHistory} from "./components/CustomAssistantRuntimeProvider.jsx";

export const ChatInterface = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();
    // const threadIDList = runtime.threads.getState().threads;
    // console.log(threadIDList.map(tid => runtime.threads.getItemById(tid)));
    const assistantAvatar = useAssistantAvatar();
    const suggestions = useChatSuggestions();

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
    useCustomChatHistory();
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
    useModelContext();

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