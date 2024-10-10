// Source: https://public.amplenote.com/1v3vCijAidQnkJu8TDiQJAeR
export function getCorsBypassUrl(url) {
    const proxyURL = new URL("https://plugins.amplenote.com/cors-proxy");
    proxyURL.searchParams.set("apiurl", url);
    return proxyURL;
}