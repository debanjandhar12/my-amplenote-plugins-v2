import { Omnivore } from "@omnivore-app/api"

const baseUrl = endpoint => endpoint.replace(/\/api\/graphql$/, "")

export const saveOmnivoreItem = async (apiKey, itemUrl, endpoint) => {
    const omnivore = new Omnivore({
        apiKey,
        baseUrl: baseUrl(endpoint),
        timeoutMs: 10000
    })

    return await omnivore.items.saveByUrl({ url: itemUrl });
}

export const deleteOmnivoreItem = async (apiKey, itemId, endpoint) => {
    const omnivore = new Omnivore({
        apiKey,
        baseUrl: baseUrl(endpoint),
        timeoutMs: 10000
    })
    await omnivore.items.delete({ id: itemId });
}


