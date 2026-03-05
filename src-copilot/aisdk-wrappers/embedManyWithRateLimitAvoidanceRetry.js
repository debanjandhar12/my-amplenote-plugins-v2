import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

let embedMany;
export async function embedManyWithRateLimitAvoidanceRetry ({model, values}) {
    if (!embedMany) {
        embedMany = (await dynamicImportESM("ai")).embedMany;
    }
    try {
        return await embedMany({
            model,
            values,
            maxRetries: 1   // retry once anyway without timeout
        });
    } catch (e) {
        if (!shouldRetryThisError(e)) throw e;
        console.warn('embedManyWithRateLimitAvoidanceRetry: Retrying after 60s..');
    }
    await new Promise(resolve => setTimeout(resolve, 60 * 1000)); // Sleep 1min
    return await embedMany({
        model,
        values,
        maxRetries: 0
    });
}

// -- Check if rate limited (https://github.com/remorses/ai-fallback/blob/main/src/index.ts) --
const retryableStatusCodes = [
    408, // request timeout
    409, // conflict
    413, // payload too large
    429, // too many requests/rate limits
    498, // groq flex rate limit https://console.groq.com/docs/errors
    500, // server error (and above)
]
const retryableErrors = [
    'overloaded',
    'service unavailable',
    'bad gateway',
    'too many requests',
    'toomanyrequests', // camelCase/PascalCase variant
    'too many requests', // camelCase/PascalCase variant
    'internal server error',
    'gateway timeout',
    'rate_limit',
    'ratelimit', // variant without underscore
    'rate limit', // variant with space
    'failed to reach',
    'capacity',
    'timeout',
    'timedout',
    'server_error',
    '429', // Too Many Requests
    '500', // Internal Server Error
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
]
function shouldRetryThisError(error) {
    let statusCode = error?.['statusCode']

    if (
        statusCode &&
        (retryableStatusCodes.includes(statusCode) || statusCode > 500)
    ) {
        return true;
    }

    if (error && typeof error === 'object') {
        const errorString = JSON.stringify(error).toLowerCase() || ''
        return retryableErrors.some((errType) => errorString.includes(errType))
    }
    return false;
}