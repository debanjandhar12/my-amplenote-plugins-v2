import {parse} from "./markdown-parser.js";
import {visitParents} from "unist-util-visit-parents";

export const replaceParagraphTextInMarkdown = async (markdownText, replaceFunc) => {
    const ast = await parse(markdownText);
    let result = markdownText;

    const textNodes = [];
    visitParents(ast, (node, ancestors) => {
        if (node.type === 'text' && ancestors.some(parent => parent.type === 'paragraph')) {
            textNodes.push(node);
        }
    });
    textNodes.sort((a, b) => b.position.start.offset - a.position.start.offset);
    textNodes.forEach(node => {
        const {start, end} = node.position;
        const startIndex = start.offset;
        const endIndex = end.offset;

        result = result.slice(0, startIndex) + replaceFunc(node.value) + result.slice(endIndex);
    });

    return result;
}