/**
 * Creates a table for selecting items, with optional diff view when oldItemContainerList is provided.
 * @param status Current status
 * @param itemContainerList Array of objects with selected property and item property
 * @param setItemContainerList Setter for itemContainerList
 * @param oldItemContainerList Optional previous state of items for diff view
 * @param setOldItemContainerList Optional setter for oldItemContainerList
 */
export const ItemSelectionTable = ({
                                       status,
                                       itemContainerList,
                                       setItemContainerList,
                                       oldItemContainerList
                                   }) => {
    const isThisToolMessageLast = AssistantUI.useMessage((m) => m.isLast);
    const isDiffView = !!oldItemContainerList;
    const itemsToIterate = isDiffView ? itemContainerList : itemContainerList;

    const allItemKeys = itemsToIterate.reduce((keys, itemContainer) => {
        Object.keys(itemContainer.item).forEach((key) => {
            if (!keys.includes(key) && itemContainer.item[key]) {
                keys.push(key);
            }
        });
        return keys;
    }, []);

    const formatValue = (value) => {
        return typeof value === "object" ? JSON.stringify(value) : value;
    };

    const handleCheckedChange = (checked, index) => {
        const newList = [...itemContainerList];
        newList[index].checked = checked;
        setItemContainerList(newList);
    };

    const renderCell = (itemContainer, index, key) => {
        if (isDiffView) {
            return (
                <StringDiff
                    method={'diffSentences'}
                    styles={{
                        added: {
                            backgroundColor: '#0bbf7d',
                        },
                        removed: {
                            backgroundColor: '#ff6b6b',
                        }
                    }}
                    oldValue={formatValue(oldItemContainerList[index].item[key])}
                    newValue={formatValue(itemContainer.item[key])}
                    showDiff={true}
                />
            );
        }
        return formatValue(itemContainer.item[key]);
    };

    return (
        <RadixUI.Table.Root>
            <RadixUI.Table.Header>
                <RadixUI.Table.Row>
                    <RadixUI.Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>
                        <RadixIcons.CheckCircledIcon />
                    </RadixUI.Table.ColumnHeaderCell>
                    {allItemKeys.map((key) => (
                        <RadixUI.Table.ColumnHeaderCell key={key}>
                            {key}
                        </RadixUI.Table.ColumnHeaderCell>
                    ))}
                </RadixUI.Table.Row>
            </RadixUI.Table.Header>
            <RadixUI.Table.Body>
                {itemsToIterate.map((itemContainer, index) => (
                    <RadixUI.Table.Row key={index}>
                        <RadixUI.Table.RowHeaderCell>
                            <RadixUI.Checkbox
                                checked={itemContainer.checked}
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onCheckedChange={(checked) => handleCheckedChange(checked, index)}
                            />
                        </RadixUI.Table.RowHeaderCell>
                        {allItemKeys.map((key) => (
                            <RadixUI.Table.Cell key={key}>
                                {renderCell(itemContainer, index, key)}
                            </RadixUI.Table.Cell>
                        ))}
                    </RadixUI.Table.Row>
                ))}
            </RadixUI.Table.Body>
        </RadixUI.Table.Root>
    );
};