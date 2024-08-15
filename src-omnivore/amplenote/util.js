import _ from "lodash";

export function sortOmnivoreItems(omnivoreItems, sortKeyOrder) {
    let [sortKey, sortOrder] = sortKeyOrder.trim().split("-");

    const validKeys = ["updatedAt", "savedAt"];
    if (!validKeys.map(k => k.toLowerCase()).includes(sortKey.toLowerCase())) {
        throw new Error(`Invalid omnivore items sort key: ${sortKey}`);
    } else {
        sortKey = validKeys[validKeys.map(k => k.toLowerCase()).indexOf(sortKey.toLowerCase())];
    }

    if (!["asc", "desc"].includes(sortOrder)) {
        throw new Error(`Invalid sort order: ${sortOrder}`);
    }

    return _.cloneDeep(omnivoreItems).sort((a, b) => {
        const aValue = a[sortKey] || "";
        const bValue = b[sortKey] || "";
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortOrder === "asc" ? comparison : -comparison;
    });
}

export function sortOmnivoreItemHighlights(omnivoreItemHighlights, sortKeyOrder) {
    let [sortKey, sortOrder] = sortKeyOrder.trim().split("-");

    const validKeys = ["updatedAt"];
    if (!validKeys.map(k => k.toLowerCase()).includes(sortKey.toLowerCase())) {
        throw new Error(`Invalid highlights sort key: ${sortKey}`);
    } else {
        sortKey = validKeys[validKeys.map(k => k.toLowerCase()).indexOf(sortKey.toLowerCase())];
    }

    if (!["asc", "desc"].includes(sortOrder)) {
        throw new Error(`Invalid sort order: ${sortOrder}`);
    }

    return _.cloneDeep(omnivoreItemHighlights).sort((a, b) => {
        const aValue = a[sortKey] || "";
        const bValue = b[sortKey] || "";
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortOrder === "asc" ? comparison : -comparison;
    });
}
