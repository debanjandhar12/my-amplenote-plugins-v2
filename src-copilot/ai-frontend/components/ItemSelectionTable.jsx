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
    const itemsToIterate = isDiffView ? itemContainerList : itemContainerList;

    const allItemKeys = itemsToIterate.reduce((keys, itemContainer) => {
        Object.keys(itemContainer.item).forEach((key) => {
            if (!keys.includes(key) && itemContainer.item[key]) {
                keys.push(key);
            }
        });
        return keys;
    }, []);

    const formatStringValue = (value, key) => {
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
        if (isDiffView &&
            oldItemContainerList[index].item[key] !== itemContainer.item[key]) {
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
                    oldValue={formatStringValue(oldItemContainerList[index].item[key])}
                    newValue={formatStringValue(itemContainer.item[key])}
                    showDiff={true}
                />
            );
        } else if (key.toLowerCase().includes('uuid')) {
            return <TruncatedUUID value={itemContainer.item[key]} />;
        }
        return formatStringValue(itemContainer.item[key]);
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
            <Flex align="center" css={{ cursor: 'help' }}>
                <Tooltip content={value}>
                    <InfoCircledIcon />
                </Tooltip>
            </Flex>
        </Flex>
    );
};