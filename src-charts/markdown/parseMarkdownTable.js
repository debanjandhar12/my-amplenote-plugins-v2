import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import remarkGfm from "remark-gfm";

export function parseMarkdownTable(markdownText) {
    const result = [];

    const tree = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(markdownText);

    visit(tree, 'table', (node) => {
        node.children.forEach((row) => {
            const rowData = [];
            row.children.forEach((cell) => {
                // Get the text content of the cell
                const cellText = cell.children[0]?.value || '';
                rowData.push(cellText.trim());
            });
            result.push(rowData);
        });

        return false; // Stop after processing the first table
    });

    return result;
}