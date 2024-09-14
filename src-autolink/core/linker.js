import {cloneDeep, escapeRegExp} from "lodash-es";
import {parse} from "./parser";
import {visitParents} from 'unist-util-visit-parents'
import {nanoid} from "nanoid";

async function processTextNodes(markdownText, callback, {avoidLinks = true,
    avoidHeaders = true} = {}) {
    const ast = await parse(markdownText);
    console.log('ast', ast, markdownText);
    const flattenedTextNodes = [];
    visitParents(ast, 'text', (node, ancestors) => {
        const isInsideLink = ancestors.some(ancestor => ancestor.type === 'link');
        if (avoidLinks && isInsideLink) return;
        const isInsideHeader = ancestors.some(ancestor => ancestor.type === 'heading');
        if (avoidHeaders && isInsideHeader) return;

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

/**
 * The `preReplacementMarkdown` property of the returned object is a markdown string
 * which has all page links replaced with uuids. Later, the `replacementMap` property
 * can be used to replace the uuids with the page links later.
 * Returns
 * @param {string} markdownText - the markdown text to link
 * @param {Object[]} pages - an array of objects with properties `name` and `uuid` to match against
 * @returns {Promise<{
*     originalMap: Map<string, string>,
*     replacementMap: Map<string, string>,
*     preReplacementMarkdown: string
* }>}
 */
export async function addPageLinksToMarkdown(markdownText, pages) {
    const replacementMap = new Map();
    const originalMap = new Map();
    const sortedPages = cloneDeep(pages).sort((a, b) => -a.name.localeCompare(b.name)); // descending
    const preReplacementMarkdown = await processTextNodes(markdownText, (text) => {
        sortedPages.forEach(page => {
            const pageNameEscaped = escapeRegExp(page.name);
            let regex = new RegExp(`((?<=^|\\s|,))(${pageNameEscaped})((,|!|\\.)*?)($|\\s|\\n|,)`, 'gi');
            text = text.replace(regex, (match, g1, g2, g3, g4, g5) => {
                const uuid = g1 + nanoid() + g3 + g4 + g5;
                originalMap.set(uuid, match);
                replacementMap.set(uuid, `${g1}[${g2}](https://www.amplenote.com/notes/${page.uuid})${g3}${g5}`);
                return uuid;
            });
        });
        return text;
    });
    return {originalMap, replacementMap, preReplacementMarkdown};
}

/**
 * The `preReplacementMarkdown` property of the returned object is a markdown string
 * which has all section links replaced with uuids. Later, the `replacementMap` property
 * can be used to replace the uuids with the page links later.
 * Returns
 * @param {string} markdownText - the markdown text to link
 * @param {Object} sectionsMap - todo
 * @returns {Promise<{
*     originalMap: Map<string, string>,
*     replacementMap: Map<string, string>,
*     preReplacementMarkdown: string
* }>}
 */
export async function addSectionLinksToMarkdown(markdownText, sectionsMap) {
    const replacementMap = new Map();
    const originalMap = new Map();
    const sortedSections = Object.keys(sectionsMap).sort((a, b) => b.length - a.length);    // descending

    const preReplacementMarkdown = await processTextNodes(markdownText, (text) => {
        sortedSections.forEach(section => {
            const sectionNameEscaped = escapeRegExp(section);
            let regex = new RegExp(`((?<=^|\\s|,))(${sectionNameEscaped})((,|!|\\.)*?)($|\\s|\\n|,)`, 'gi');
            text = text.replace(regex, (match, g1, g2, g3, g4, g5) => {
                const uuid = g1 + nanoid() + g3 + g4 + g5;
                originalMap.set(uuid, match);
                replacementMap.set(uuid, `${g1}[${section}](https://www.amplenote.com/notes/${sectionsMap[section].noteUUID}#${sectionsMap[section].anchor})${g3}${g5}`);
                return uuid;
            });
        });
        return text;
    });
    return {originalMap, replacementMap, preReplacementMarkdown};
}

/**
 * Replaces all uuids in the markdownText with the corresponding string from the replacementMap.
 * @param {string} markdownText - the markdown text to replace uuids in
 * @param {Map<string, string>} replacementMap - mapping of uuids to strings to replace them with
 * @returns {string} the markdown text with all uuids replaced.
 */
export function processReplacementMap(markdownText, replacementMap) {
    let result = markdownText;
    replacementMap.forEach((replacement, uuid) => {
        result = result.replace(uuid.trim(), replacement.trim());
    });
    return result;
}