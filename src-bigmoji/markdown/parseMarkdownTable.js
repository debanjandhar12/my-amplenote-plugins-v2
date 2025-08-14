import { visit } from 'unist-util-visit';
import {parse} from "./parser.js";

/**
 * Ths is not same one as used in charts plugin.
 * Unlike the charts version, this puts image values inside cell of table.
 * @param markdownText
 * @returns {*[]}
 */
export async function parseMarkdownTable(markdownText) {
    const result = [];

    const tree = await parse(markdownText);

    visit(tree, 'table', (node) => {
        node.children.forEach((row) => {
            const rowData = [];
            row.children.forEach((cell) => {
                let cellText = '';
                visit(cell, 'text', (textNode) => {
                    cellText += textNode.value;
                });
                visit(cell, 'image', (imageNode) => {
                    cellText += `![](${imageNode.url})`;
                });
                rowData.push(cellText.trim());
            });
            result.push(rowData);
        });

        return false; // Stop after processing the first table
    });

    // Remove all empty rows
    return result.filter(row => !row.every(cell => cell.trim() === ''));
}