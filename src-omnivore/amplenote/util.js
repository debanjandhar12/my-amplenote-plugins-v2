export function sortOmnivoreItems(omnivoreItems, sortKeyOrder) {
    let [sortKey, sortOrder] = sortKeyOrder.trim().split("-");

    const validKeys = ["updatedat", "savedat"];
    if (validKeys.indexOf(sortKey.toLowerCase()) === -1) {
        throw new Error(`Invalid sort key: ${sortKey}`);
    }
    else {
        sortKey = validKeys[validKeys.indexOf(sortKey.toLowerCase())];
    }

    if (["asc", "desc"].indexOf(sortOrder) === -1) {
        throw new Error(`Invalid sort order: ${sortOrder}`);
    }

    return omnivoreItems.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) {
            return sortOrder === "asc" ? -1 : 1;
        }
        else if (a[sortKey] > b[sortKey]) {
            return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
    });
}

export function sortOmnivoreItemHighlights(omnivoreItemHighlights, sortKeyOrder) {
    let [sortKey, sortOrder] = sortKeyOrder.trim().split("-");

    const validKeys = ["updatedat"];
    if (validKeys.indexOf(sortKey.toLowerCase()) === -1) {
        throw new Error(`Invalid sort key: ${sortKey}`);
    }
    else {
        sortKey = validKeys[validKeys.indexOf(sortKey.toLowerCase())];
    }

    if (["asc", "desc"].indexOf(sortOrder) === -1) {
        throw new Error(`Invalid sort order: ${sortOrder}`);
    }
    return omnivoreItemHighlights.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) {
            return sortOrder === "asc" ? -1 : 1;
        }
        else if (a[sortKey] > b[sortKey]) {
            return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
    });
}