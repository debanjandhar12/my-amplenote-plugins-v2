/**
 * Creates a table for selecting items.
 * @param itemContainerList Must be array of objects. Each object must have a selected property and item property.
 * @param setItemList
 * @param status
 * @constructor
 */
export const ItemSelectionTable = ({itemContainerList, setItemContainerList, status}) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    const allItemKeys = itemContainerList.reduce((keys, itemContainer) => {
        Object.keys(itemContainer.item).forEach((key) => {
            if (!keys.includes(key) && itemContainer.item[key]) {
                keys.push(key);
            }
        });
        return keys;
    }, []);

    return (<RadixUI.Table.Root>
                <RadixUI.Table.Header>
                    <RadixUI.Table.Row>
                        <RadixUI.Table.ColumnHeaderCell>Checkbox</RadixUI.Table.ColumnHeaderCell>
                        {allItemKeys.map((key) => (
                            <RadixUI.Table.ColumnHeaderCell key={key}>
                                {key}
                            </RadixUI.Table.ColumnHeaderCell>
                        ))}
                    </RadixUI.Table.Row>
                </RadixUI.Table.Header>
                <RadixUI.Table.Body>
                    {itemContainerList.map((itemContainer, index) => (
                        <RadixUI.Table.Row key={index}>
                            <RadixUI.Table.RowHeaderCell>
                                <RadixUI.Checkbox
                                    checked={itemContainer.checked}
                                    disabled={
                                        status === "requires-action" || !isThisToolMessageLast
                                    }
                                    onCheckedChange={(checked) => {
                                        const newItemContainerList = [...itemContainerList];
                                        newItemContainerList[index].checked = checked;
                                        setItemContainerList(newItemContainerList);
                                    }}
                                />
                            </RadixUI.Table.RowHeaderCell>
                            {allItemKeys.map((key) => (
                                <RadixUI.Table.Cell key={key}>
                                    {typeof itemContainer.item[key] === "object" ? JSON.stringify(itemContainer.item[key]) : itemContainer.item[key]}
                                </RadixUI.Table.Cell>
                            ))}
                        </RadixUI.Table.Row>
                    ))}
                </RadixUI.Table.Body>
            </RadixUI.Table.Root>)
}