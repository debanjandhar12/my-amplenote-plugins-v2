import {parse} from "./markdown-parser.js";
import {visit} from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";

/**
 * This function removes YAML frontmatter and returns text only content with all Markdown formatting removed.
 * @param markdownText
 * @returns {Promise<string>}
 */
export const stripYAMLFromMarkdown = async (markdownText) => {
    const root = await parse(markdownText);

    let textContent = '';
    visit(root, (node) => {
        if (node.type === 'yaml') {
            return 'skip';
        }
        else if (node.type === 'root' || node.type === 'paragraph') {
            return 'continue';
        }
        else if (node.type === 'image') {
            textContent += `![](${node.url})` + '\n';
        }
        else {
            const nodeValue = node.position ?
                markdownText.substring(node.position.start.offset, node.position.end.offset)
                : mdastToString(node);
            textContent += nodeValue + '\n';
            return 'skip';
        }
    });
    return textContent.trim();
}