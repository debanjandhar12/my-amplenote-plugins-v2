import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {omit} from "lodash-es";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";

export const webSearchTool = () => {
    return createGenericReadTool({
        toolName: "webSearchTool",
        description: "Search the web for information.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The query to search for.",
                    minLength: 1,
                }
            },
            required: ["query"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@web-search")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        itemName: 'web search results',
        onInitFunction: async ({args}) => {
            const query = args.query;
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`);
            return await response.json();
        }
    });
}

// export const webSearchTool = () => {
//     return createGenericReadTool({
//         toolName: "webSearchTool",
//         description: "Search the web for information.",
//         parameters: {
//             type: "object",
//             properties: {
//                 query: {
//                     type: "string",
//                     description: "The query to search for.",
//                     minLength: 1,
//                 }
//             },
//             required: ["query"]
//         },
//         triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@web-search")
//         || JSON.stringify(allUserMessages).includes("@all-tools"),
//         itemName: 'web search results',
//         onInitFunction: async ({args}) => {
//             const query = args.query;
//             const googleThis = (await dynamicImportESM("googlethis")).default;
//             let searchResults = await googleThis.search(query);
//             searchResults = omit(searchResults, 'people_also_ask');
//             searchResults.results = searchResults.results || [];
//             searchResults.results = searchResults.results.map((result) => {
//                 if (result.favicons)    // Remove favicons
//                     delete result.favicons;
//                 if (result.url) // Remove url params from url
//                     result.url = result.url.split("?")[0];
//                 return result;
//             });
//             searchResults = cleanObj(searchResults);
//             return searchResults;
//         }
//     });
// }
//
// // Utility function to remove empty values and large values from an object
// export function cleanObj(inputObj) {
//     function isEmpty(value) {
//         if (value === null || value === undefined || value === false
//             || (typeof value === 'string' && value.trim() === '')
//             || (typeof value === 'string' && value.startsWith('data:image/png;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/jpeg;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/jpg;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/gif;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/webp;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/svg+xml;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/bmp;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/tiff;base64,'))
//             || (typeof value === 'string' && value.startsWith('data:image/x-icon;base64,'))
//             || (typeof value === 'string' && value.startsWith('base64,'))
//             || (typeof value === 'string' && value.length > 1024)
//             || (typeof value === 'number' && isNaN(value))
//             || (typeof value === 'object' && Object.keys(value).length === 0)
//             || (typeof value === 'function' && value.toString().trim() === '() => {}')
//             || (typeof value === 'function' && value.toString().trim() === 'function () {}')) {
//             return true;
//         }
//
//         if (Array.isArray(value)) {
//             return value.every(isEmpty);
//         } else if (typeof (value) === 'object') {
//             return Object.values(value).every(isEmpty);
//         }
//
//         return false;
//     }
//     return JSON.parse(JSON.stringify(inputObj, (k, v) => isEmpty(v)
//         ? undefined
//         : v));
// }