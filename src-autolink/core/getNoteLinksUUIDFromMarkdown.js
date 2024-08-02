import {parse} from "./parser.js";
import {visitParents} from "unist-util-visit-parents";

export async function getNoteLinksUUIDFromMarkdown(markdownText) {
    const ast = await parse(markdownText);
    const linkedNoteUUIDs = [];
    visitParents(ast, 'link', (node, ancestors) => {
        const url = node.url;
        const matches = url.match(/(https?:\/\/)?(www\.)?amplenote\.com\/notes\/([a-f0-9-]+)(\??.*)(#?.*)?/);
        if (matches) {
            linkedNoteUUIDs.push(matches[3]);
        }
    });
    return linkedNoteUUIDs;
}