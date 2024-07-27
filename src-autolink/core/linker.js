import {escapeRegExp} from "lodash";
import {parse} from "./parser";
import {visitParents} from 'unist-util-visit-parents'

export async function autoLink(markdownText, pages) {
    // Extract text nodes from markdownText
    const ast = await parse(markdownText);
    console.log('ast', ast);
    const flattenedTextNodes = [];
    visitParents(ast, 'text', (node, ancestors) => {
        const isInsideLink = ancestors.some(ancestor => ancestor.type === 'link');
        if (isInsideLink) return;

        flattenedTextNodes.push(node);
    });
    console.log('flattenedTextNodes', flattenedTextNodes);

    // Sort flattenedTextNodes by start offset in descending order
    flattenedTextNodes.sort((a, b) => b.position.start.offset - a.position.start.offset);

    // Process each text node
    let resultMarkdownText = markdownText;
    for (const node of flattenedTextNodes) {
        const linkedText = autoLinkTextWithPages(node.value, pages);
        if (linkedText !== node.value) {
            const start = node.position.start.offset;
            const end = node.position.end.offset;
            resultMarkdownText = resultMarkdownText.slice(0, start) + linkedText + resultMarkdownText.slice(end);
        }
    }

    return resultMarkdownText;
}


function autoLinkTextWithPages(text, pages) {
    pages.forEach(page => {
        const pageNameEscaped = escapeRegExp(page.name);
        let regex = new RegExp(`(^|\\s|,)(${pageNameEscaped})((,|!|\\.)*?)($|\\s|\\n)`, 'gi');
        text = text.replace(regex, `$1[$2](https://www.amplenote.com/notes/${page.uuid})$3$5`);
    });
    return text;
}