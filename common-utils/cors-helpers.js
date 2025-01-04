/**
 * This function wraps a given URL with a proxy URL to bypass CORS restrictions.
 * It uses the proxy provided at https://plugins.amplenote.com/cors-proxy.
 *
 * @param {string} url - The original URL that needs to bypass CORS restrictions.
 * @returns {URL} - A new URL object representing the proxy-wrapped URL.
 *
 * // Source: https://public.amplenote.com/1v3vCijAidQnkJu8TDiQJAeR
 */
export function getCorsBypassUrl(url) {
    const proxyURL = new URL("https://plugins.amplenote.com/cors-proxy");
    proxyURL.searchParams.set("apiurl", url);
    return proxyURL;
}

/**
 * A utility function to fetch from a list of URLs with a fallback mechanism.
 *
 * @param {string[]} urls - An array of URLs to attempt fetching from.
 * @param {RequestInit} [options] - Optional fetch options such as method, headers, etc.
 * @param {boolean} [retryInvalidUrls=true] - Determines if URLs previously marked as invalid should be retried.
 * @returns {Promise<Response>} - The successful fetch response.
 * @throws {Error} - Throws the last encountered error if all URLs fail or a non-CORS error occurs.
 */
const isUrlNotWorkingMap = new Map();
export async function fetchWithFallback(urls, options, retryInvalidUrls = true) {
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        let baseUrl;
        try {
            baseUrl = url.match(/^https?:\/\/[^#?\/]+/)?.[0];
            if (!retryInvalidUrls && isUrlNotWorkingMap.has(baseUrl)) {
                throw isUrlNotWorkingMap.get(baseUrl);
            }
            return await fetch(url, options);
        } catch (e) {
            isUrlNotWorkingMap.set(baseUrl, e);
            // Throw error if it's the last URL or not a CORS-related error
            if (i === urls.length - 1 || !String(e.message).includes('CORS')) {
                throw e;
            }
        }
    }
}
