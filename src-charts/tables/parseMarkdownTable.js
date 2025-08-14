import { visit } from 'unist-util-visit';
import { parse } from "../utils/parser.js";

export async function parseMarkdownTable(markdownText) {
    const result = [];

    const tree = await parse(markdownText);

    visit(tree, 'table', (node) => {
        node.children.forEach((row) => {
            const rowData = [];
            row.children.forEach((cell) => {
                // Get the text content of the cell
                let cellText = '';
                visit(cell, 'text', (textNode) => {
                    cellText += textNode.value;
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