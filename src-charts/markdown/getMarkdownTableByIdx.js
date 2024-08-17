import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {visit} from 'unist-util-visit';
import remarkGfm from "remark-gfm";

export function getMarkdownTableByIdx(markdownText, idx = 0) {
    let tableCount = 0;
    let targetTable = null;

    const tree = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(markdownText);

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

    return markdownText.substring(start.offset, end.offset);
}