import {truncate} from "lodash-es";

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
    const itemsToIterate = itemContainerList;

    const keySet = new Set();
    itemContainerList.forEach(itemContainer => {
        Object.keys(itemContainer.item).forEach(key => keySet.add(key));
    });
    if (isDiffView) {
        oldItemContainerList.forEach(itemContainer => {
            Object.keys(itemContainer.item).forEach(key => keySet.add(key));
        });
    }
    const allItemKeys = ['uuid', ...Array.from(keySet).filter(k => k !== 'uuid')];

    const formatStringValue = (value, key) => {
        if (value === undefined) return '';
        if (value === null) return 'null';
        if (typeof value === 'boolean') return value.toString();
        try {
            if (isNaN(value) && (typeof value === 'string' && isNaN(Number(value)))) {
                const date = new Date(value);
                if (isNaN(date.getTime())) throw new Error('Invalid date');
                return date.toLocaleString();
            }
        } catch (e) {}
        return typeof value === "object" ? JSON.stringify(value) : value.toString();
    };

    const handleCheckedChange = (checked, index) => {
        const newList = [...itemContainerList];
        newList[index].checked = checked;
        setItemContainerList(newList);
    };

    const renderCell = (itemContainer, index, key) => {
        let valueToDisplay = itemContainer.item[key];

        if (isDiffView) {
            const oldValue = oldItemContainerList[index].item[key];
            const isChanged = key in itemContainer.item;

            if (isChanged && oldValue !== valueToDisplay) {
                const StringDiff = window.StringDiff;
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
                        oldValue={formatStringValue(oldValue)}
                        newValue={formatStringValue(valueToDisplay)}
                        showDiff={true}
                    />
                );
            }

            if (!isChanged) {
                valueToDisplay = oldValue;
            }
        }

        if (key.toLowerCase().includes('uuid')) {
            return <TruncatedUUID value={valueToDisplay} />;
        }
        return formatStringValue(valueToDisplay);
    };

    const { Table, Checkbox } = window.RadixUI;
    const { CheckIcon, InfoCircledIcon } = window.RadixIcons;
    return (
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>
                        <CheckIcon />
                    </Table.ColumnHeaderCell>
                    {allItemKeys.map((key) => (
                        <Table.ColumnHeaderCell key={key}>
                            {key}
                        </Table.ColumnHeaderCell>
                    ))}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {itemsToIterate.map((itemContainer, index) => (
                    <Table.Row key={index}>
                        <Table.RowHeaderCell>
                            <Checkbox
                                checked={itemContainer.checked}
                                disabled={status === "requires-action" || !isThisToolMessageLast}
                                onCheckedChange={(checked) => handleCheckedChange(checked, index)}
                            />
                        </Table.RowHeaderCell>
                        {allItemKeys.map((key) => (
                            <Table.Cell key={key}>
                                {renderCell(itemContainer, index, key)}
                            </Table.Cell>
                        ))}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
};

const TruncatedUUID = ({ value }) => {
    const truncated = truncate(value, { length: 5, omission: '...' });

    const { InfoCircledIcon } = window.RadixIcons;
    const { Flex, Tooltip } = window.RadixUI;

    return (
        <Flex align="center" gap="2">
            <span>{truncated}</span>
            <Tooltip content={value || 'New UUID'}>
                <Flex align="center" css={{ cursor: 'help' }}>
                    <InfoCircledIcon />
                </Flex>
            </Tooltip>
        </Flex>
    );
};