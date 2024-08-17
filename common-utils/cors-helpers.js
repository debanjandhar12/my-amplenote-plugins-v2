// Source: https://public.amplenote.com/1v3vCijAidQnkJu8TDiQJAeR
export async function getCorsBypassUrl(url) {
    const corsProxy = "https://plugins.amplenote.com/cors-proxy?apiurl="+encodeURIComponent(url);
    return corsProxy + url;
}