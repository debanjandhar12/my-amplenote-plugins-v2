import {useTributeSetup} from "../hooks/useTributeSetup.jsx";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";

export const CustomEditComposer = () => {
    const textareaRef = React.useRef(null);
    useTributeSetup(textareaRef, ToolCategoryRegistry.getAllCategoriesNames());    // setup tribute for autocomplete in composer.input

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