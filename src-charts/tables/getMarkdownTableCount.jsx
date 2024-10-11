import {getMarkdownTableByIdx} from "./getMarkdownTableByIdx.js";

export function getMarkdownTableCount(markdownText) {
    let tableCount = 0;
    for (let i = 0; i < 100; i++) {
        const table = getMarkdownTableByIdx(markdownText, i);
        if (table !== null) {
            tableCount++;
        }
        else {
            break;
        }
    }
    return tableCount;
}