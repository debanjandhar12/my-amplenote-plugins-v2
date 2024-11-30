import {parse} from "./markdown-parser.js";
import {visit} from "unist-util-visit";

export const removeYAMLFrontmatterFromMarkdown = async (markdownText) => {
    const root = await parse(markdownText);

    let textContent = '';
    visit(root, (node) => {
        if (node.type === 'yaml') {
            return 'skip';
        }
        if (node.type === 'text') {
            textContent += node.value;
        }
    });
    return textContent;
}