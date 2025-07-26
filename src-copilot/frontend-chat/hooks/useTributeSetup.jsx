import { getChatAppContext } from "../context/ChatAppContext.jsx";
import {useEnabledTools} from "./useEnabledTools.jsx";

export const useTributeSetup = (textareaRef, toolGroupNames) => {
    const { enableToolGroup } = useEnabledTools();
    const composerRuntime = AssistantUI.useComposerRuntime();

    React.useEffect(() => {
        if (!textareaRef.current) return;
        const style = document.createElement('style');
        style.textContent = `
            .tribute-container > ul {
                background-color: #434A54; 
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                color: #FFFFFF; 
                margin: 10px;
                padding: 0;
                list-style: none;
            }
            .tribute-item {
                padding: 8px;
                cursor: pointer;
                border-bottom: 1px solid #333333;
            }
            .tribute-item:hover {
                background-color: #2d4759;
            }
            .tribute-item-selected {
                background-color: #2d4759;
                color: #FFFFFF;
            }
        `;
        document.body.append(style);
        const tribute = new window.Tribute({
            trigger: '@',
            values: toolGroupNames.map(toolGroup => { return {
                key: toolGroup,
                value: toolGroup
            }}),
            noMatchTemplate: null,
            containerClass: 'tribute-container',
            itemClass: 'tribute-item',
            selectClass: 'tribute-item-selected',
            allowSpaces: false,
            menuItemLimit: 4,
            replaceTextSuffix: ' '
        });
        tribute.attach(textareaRef.current);
        const tributeOnReplace = (event) => {
            // Enabled tool group in composer menu
            const selectedToolGroup = event.detail.item.original.value;
            enableToolGroup(selectedToolGroup);

            // Update composer text to inform assistant-ui about textarea change
            const currentTextAreaValue = textareaRef.current.value;
            composerRuntime.setText(currentTextAreaValue);
        }
        textareaRef.current
            .addEventListener("tribute-replaced", tributeOnReplace);

        return () => {  // cleanup
            if (!textareaRef.current) return;
            tribute.detach(textareaRef.current);
            textareaRef.current
                .removeEventListener("tribute-replaced", tributeOnReplace);
        };
    }, [textareaRef, toolGroupNames]);
}