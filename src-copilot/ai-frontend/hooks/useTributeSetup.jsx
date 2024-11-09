export const useTributeSetup = (textareaRef, toolCategoryNames) => {
    const composer = AssistantUI.useThreadComposer();
    React.useEffect(() => {
        if (!textareaRef.current) return;
        const style = document.createElement('style');
        style.textContent = `
            .tribute-container > ul {
                background-color: var(--accent-a3, #1e1e1e);
                border-radius: var(--radius-4);
                box-shadow: var(--shadow-4);
                color: var(--accent-11, #ffffff);
                margin: 10px;
                padding: 0;
                list-style: none;
            }
            .tribute-item {
                padding: var(--space-2) var(--space-4);
                margin: var(--space-1) 0;
                cursor: pointer;
                padding: 8px;
                border-bottom: 1px solid var(--color-muted, #333333);
            }
            .tribute-item:hover {
                background-color: var(--color-background-hover, #2c2c2c);
            }
            .tribute-item-selected {
                background-color: var(--color-background-selected, #3a3a3a);
                color: var(--color-text-selected, #ffffff);
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