import {ChatAppWindow} from "./ChatAppWindow.jsx";
import {ChatAppContextProvider} from "./context/ChatAppContext.jsx";
import {RemoteAssistantRuntimeProvider} from "./components/RemoteAssistantRuntimeProvider.jsx";

export const ChatApp = () => {
    const {Theme} = window.RadixUI;

    return (
        <ChatAppContextProvider>
            <Theme appearance="dark" accentColor="blue">
                <RemoteAssistantRuntimeProvider>
                    <ChatAppWindow />
                </RemoteAssistantRuntimeProvider>
            </Theme>
        </ChatAppContextProvider>
    )
}