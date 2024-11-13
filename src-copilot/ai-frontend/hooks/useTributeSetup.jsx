export const useTributeSetup = (textareaRef, toolCategoryNames) => {
    const composer = AssistantUI.useComposerRuntime();
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
            values: toolCategoryNames.map(toolCategory => { return {
                key: toolCategory,
                value: toolCategory
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
            ReactDOMTestUtils.Simulate.change(textareaRef.current); // Doesn't work atm but keeping it for future
            const currentValue = textareaRef.current.value;
            composer.setText(currentValue);
        }
        textareaRef.current
            .addEventListener("tribute-replaced", tributeOnReplace);
        return () => {  // cleanup
            tribute.detach(textareaRef.current);
            textareaRef.current
                .removeEventListener("tribute-replaced", tributeOnReplace);
        };
    }, [textareaRef]);
}