import {parse} from "./markdown-parser.js";
import {visit} from "unist-util-visit";

/**
 * This function removes YAML frontmatter and returns text only content with all Markdown formatting removed.
 * @param markdownText
 * @returns {Promise<string>}
 */
export const stripYAMLAndMarkdownFormatting = async (markdownText) => {
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