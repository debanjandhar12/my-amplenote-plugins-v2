// Source: https://github.com/omnivore-app/logseq-omnivore/blob/develop/src/api.ts

import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

const baseUrl = endpoint => endpoint.replace(/\/api\/graphql$/, "")

const getContent = async (endpoint, apiKey, libraryItemIds) => {
    const response = await fetch(`${baseUrl(endpoint)}/api/content`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: apiKey
        },
        body: JSON.stringify({ libraryItemIds, format: "highlightedMarkdown" })
    })

    if (!response.ok) {
        console.error("Failed to fetch content", response.statusText)
        throw new Error("Failed to fetch content")
    }

    return await response.json()
}

const downloadFromUrl = async url => {
    // polling until download is ready or failed
    const response = await fetch(url)
    if (!response.ok) {
        if (response.status === 404) {
            // retry after 1 second if download returns 404
            await new Promise(resolve => setTimeout(resolve, 1000))
            return downloadFromUrl(url)
        }

        console.error("Failed to download content", response.statusText)
        throw new Error("Failed to download content")
    }

    return await response.text()
}

const fetchContentForItems = async (endpoint, apiKey, items) => {
    const content = await getContent(
        endpoint,
        apiKey,
        items.map(a => a.id)
    )

    await Promise.allSettled(
        content.data.map(async c => {
            if (c.error) {
                console.error("Error fetching content", c.error)
                return
            }

            const item = items.find(i => i.id === c.libraryItemId)
            if (!item) {
                console.error("Item not found", c.libraryItemId)
                return
            }

            // timeout if download takes too long
            item.content = await Promise.race([
                downloadFromUrl(c.downloadUrl),
                new Promise((_, reject) => setTimeout(() => reject("Timeout"), 60000))
            ])
        })
    )
}

export const getOmnivoreItems = async (
    apiKey,
    after = 0,
    first = 10,
    updatedAt = "",
    query = "",
    includeContent = false,
    format = "html",
    endpoint
) => {
    const { Omnivore } = await dynamicImportESM("@omnivore-app/api");

    const omnivore = new Omnivore({
        apiKey,
        baseUrl: baseUrl(endpoint),
        timeoutMs: 10000
    })

    const result = await omnivore.items.search({
        after,
        first,
        query: `${updatedAt ? "updated:" + updatedAt : ""} sort:saved-asc ${query}`,
        includeContent: false,
        format
    });

    const items = result.edges.map(e => e.node)

    if (includeContent && items.length > 0) {
        try {
            await fetchContentForItems(endpoint, apiKey, items)
        } catch (error) {
            console.error("Error fetching content", error)
        }
    }

    return [items, result.pageInfo.hasNextPage]
}

export const getDeletedOmnivoreItems = async (
    apiKey,
    after = 0,
    first = 10,
    updatedAt = "",
    endpoint
) => {
    const { Omnivore } = await dynamicImportESM("@omnivore-app/api");

    const omnivore = new Omnivore({
        apiKey,
        baseUrl: baseUrl(endpoint),
        timeoutMs: 10000
    })

    const result = await omnivore.items.updates({
        after,
        first,
        since: updatedAt || "2021-01-01"
    })

    const deletedItems = result.edges
        .filter(edge => edge.updateReason === "DELETED" && edge.node)
        .map(edge => edge.node)

    return [deletedItems, result.pageInfo.hasNextPage]
}