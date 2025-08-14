import {visit} from 'unist-util-visit';
import {parse} from "../utils/parser.js";

export async function getMarkdownTableByIdx(markdownText, idx = 0) {
    let tableCount = 0;
    let targetTable = null;

    const tree = await parse(markdownText);

    visit(tree, 'table', (node) => {
        if (tableCount === idx) {
            targetTable = node;
            return false; // Stop traversal
        }
        tableCount++;
    });

    if (!targetTable || !targetTable.position) {
        return null; // Table not found at the specified index or position data is missing
    }

    const { start, end } = targetTable.position;

    if (markdownText[end.offset - 2] === '\n' && markdownText[end.offset - 1] === '\\') {
        return markdownText.substring(start.offset, end.offset - 2);
    }

    return markdownText.substring(start.offset, end.offset);
}