import {escapeRegExp} from "lodash";
import {parse} from "./parser";
import {visitParents} from 'unist-util-visit-parents'

async function processTextNodes(markdownText, callback) {
    const ast = await parse(markdownText);
    const flattenedTextNodes = [];
    visitParents(ast, 'text', (node, ancestors) => {
        const isInsideLink = ancestors.some(ancestor => ancestor.type === 'link');
        if (isInsideLink) return;

        flattenedTextNodes.push(node);
    });

    flattenedTextNodes.sort((a, b) => b.position.start.offset - a.position.start.offset);

    let resultMarkdownText = markdownText;
    for (const node of flattenedTextNodes) {
        const linkedText = callback(node.value);
        if (linkedText !== node.value) {
            const start = node.position.start.offset;
            const end = node.position.end.offset;
            resultMarkdownText = resultMarkdownText.slice(0, start) + linkedText + resultMarkdownText.slice(end);
        }
    }

    return resultMarkdownText;
}

export async function autoLinkMarkdownWithPageLinks(markdownText, pages) {
    return processTextNodes(markdownText, text => autoLinkTextWithPageLinks(text, pages));
}

function autoLinkTextWithPageLinks(text, pages) {
    pages.forEach(page => {
        const pageNameEscaped = escapeRegExp(page.name);
        let regex = new RegExp(`(^|\\s|,)(${pageNameEscaped})((,|!|\\.)*?)($|\\s|\\n)`, 'gi');
        text = text.replace(regex, `$1[$2](https://www.amplenote.com/notes/${page.uuid})$3$5`);
    });
    return text;
}

export async function autoLinkMarkdownWithSectionLinks(markdownText, sectionsMap) {
    return processTextNodes(markdownText, text => autoLinkTextWithSectionLinks(text, sectionsMap));
}

function autoLinkTextWithSectionLinks(text, sectionsMap) {
    const sortedSections = Object.keys(sectionsMap).sort((a, b) => b.length - a.length);
    sortedSections.forEach(section => {
        const sectionNameEscaped = escapeRegExp(section);
        let regex = new RegExp(`(^|\\s|,)(${sectionNameEscaped})((,|!|\\.)*?)($|\\s|\\n)`, 'gi');
        text = text.replace(regex, `$1[${section}](https://www.amplenote.com/notes/${sectionsMap[section].noteUUID}#${sectionsMap[section].anchor})$3$5`);
    });
    return text;
}