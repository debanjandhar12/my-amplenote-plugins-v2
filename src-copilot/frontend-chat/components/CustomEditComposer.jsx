import {useTributeSetup} from "../hooks/useTributeSetup.jsx";
import {getChatAppContext} from "../context/ChatAppContext.jsx";

export const CustomEditComposer = () => {
    const textareaRef = React.useRef(null);

    // Consume registry status from context
    const { toolGroupNames } = React.useContext(getChatAppContext());

    // Pass the state to the hook
    useTributeSetup(textareaRef, toolGroupNames);

    return (
        <AssistantUI.EditComposer.Root>
            <AssistantUI.EditComposer.Input ref={textareaRef} />

            <AssistantUI.EditComposer.Footer>
                <AssistantUI.EditComposer.Send />
                <AssistantUI.EditComposer.Cancel />
            </AssistantUI.EditComposer.Footer>
        </AssistantUI.EditComposer.Root>
    )
}