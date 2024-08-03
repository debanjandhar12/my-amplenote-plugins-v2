import {parse} from "./parser.js";
import {visit} from "unist-util-visit";
import _ from "lodash";

export async function removeLinksFromMarkdown(markdownText) {
    const ast = await parse(markdownText);
    let resultMarkdownText = markdownText;
    const flattenedLinkNodes = [];
    visit(ast, 'link', (node, index, parent) => {
        flattenedLinkNodes.push(node);
    });
    flattenedLinkNodes.sort((a, b) => b.position.start.offset - a.position.start.offset);

    for (const node of flattenedLinkNodes) {
        const start = node.position.start.offset;
        const end = node.position.end.offset;
        resultMarkdownText = resultMarkdownText.slice(0, start)
            + _.get(node, 'children[0].value', '') + resultMarkdownText.slice(end);
    }

    return resultMarkdownText;
}