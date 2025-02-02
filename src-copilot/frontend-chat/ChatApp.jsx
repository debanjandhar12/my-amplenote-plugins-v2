import {ChatAppWindow} from "./ChatAppWindow.jsx";
import {ChatAppContextProvider} from "./context/ChatAppContext.jsx";
import {CustomAssistantRuntimeProvider} from "./components/CustomAssistantRuntimeProvider.jsx";

export const ChatApp = () => {
    const {Theme} = window.RadixUI;

    return (
        <ChatAppContextProvider>
            <Theme appearance="dark" accentColor="blue">
                <CustomAssistantRuntimeProvider>
                    <ChatAppWindow />
                </CustomAssistantRuntimeProvider>
            </Theme>
        </ChatAppContextProvider>
    )
}