import {useDangerousInBrowserRuntimeMod} from "./hooks/useDangerousInBrowserRuntimeMod.jsx";
import {LLM_MAX_TOKENS_DEFAULT, LLM_MAX_TOKENS_SETTING} from "../constants.js";
import {errorToString} from "./tools-core/utils/errorToString.js";
import {ChatInterface} from "./ChatInterface.jsx";
import {ChatAppContextProvider} from "./context/ChatAppContext.jsx";
import {AmplenoteAttachmentAdapter} from "./components/AmplenoteAttachmentAdapter.jsx";
import {CustomAssistantRuntimeProvider} from "./components/CustomAssistantRuntimeProvider.jsx";

export const ChatApp = () => {
    const {Theme} = window.RadixUI;

    return (
        <ChatAppContextProvider>
            <Theme appearance="dark" accentColor="blue">
                <CustomAssistantRuntimeProvider>
                    <ChatInterface />
                </CustomAssistantRuntimeProvider>
            </Theme>
        </ChatAppContextProvider>
    )
}