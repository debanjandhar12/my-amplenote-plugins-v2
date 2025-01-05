import {parse} from '../markdown/markdown-parser.js';
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import {INDEX_VERSION} from "../constants.js";

export class Splitter {

    constructor(maxTokens, pluginUUID) {
        this.maxTokens = maxTokens;
        this.splitResult = [];
        this.noteContent = '';
        this.pluginUUID = pluginUUID;
    }

    addNoteContentSplitResult(note, headers) {
        this.splitResult.push({
            id: note.uuid + "##"+ this.splitResult.length,
            metadata: {
                pageContent: `---\nnote-title: ${note.name}\ncontent-hierarchy: ${headers.map((header) => `${'#'.repeat(header.depth)} ${
                    this.noteContent.substring(header.position.start.offset, header.position.end.offset).trim().replaceAll('\n','')}`).join(', ')}\n---\n`,
                noteUUID: note.uuid,
                noteTitle: note.name || note.title || 'Untitled Note',
                noteTags: (note.tags || []).join(", "),
                isTagOnly: false
            },
            dirty: false,   // Whether further content is added to this split result
            addedAmount: 0 // Amount of content added to this split result
        });
    }

    async split(app, note) {
        const noteContent = this.noteContent = await app.getNoteContent({ uuid: note.uuid });
        const root = await parse(noteContent);
        let headers = [];

        this.addNoteContentSplitResult(note, headers);
        visit(root, (node) => {
            if (node.type === 'heading') {
                headers = headers.filter((header) => header.depth < node.depth);
                headers.push(node);
                this.addNoteContentSplitResult(note, headers);
                return 'skip';
            } else if (node.type === 'root' || node.type === 'paragraph') {
                return true;    // Continue
            } else if (node.type === 'code' && node.position &&
                node.position.end.offset - node.position.start.offset > this.maxTokens) {
                console.log('Skipping code block due to length', node);
                return 'skip';
            } else {
                const nodeValue = node.position ?
                    noteContent.substring(node.position.start.offset, node.position.end.offset)
                    : mdastToString(node);

                let nodeTokens = this.tokenize(nodeValue);
                if (nodeTokens.length > this.maxTokens * 1000) {
                    console.log('Skipping else node due to length', node);
                    return 'skip';
                }
                while (nodeTokens.length > 0) {
                    let currentContent = this.splitResult[this.splitResult.length - 1].metadata.pageContent;
                    const remainingSpace = this.maxTokens - this.tokenize(currentContent).length;
                    if (remainingSpace === 0) {
                        this.addNoteContentSplitResult(note, headers);
                        currentContent = this.splitResult[this.splitResult.length - 1].metadata.pageContent;
                    }
                    const addedAmount = nodeTokens.slice(0, remainingSpace).join('').length;
                    this.splitResult[this.splitResult.length - 1].metadata.pageContent += nodeTokens.slice(0, remainingSpace).join('');
                    nodeTokens = nodeTokens.slice(remainingSpace);
                    this.splitResult[this.splitResult.length - 1].dirty = true;
                    this.splitResult[this.splitResult.length - 1].addedAmount += addedAmount;
                }
                return 'skip';
            }
        });
        this.splitResult = this.splitResult.filter((result) => result.dirty);
        this.splitResult = this.splitResult.filter((result) => result.addedAmount > 8);
        this.splitResult.forEach((result) => delete result.dirty);
        this.splitResult.forEach((result) => delete result.addedAmount);

        return this.splitResult;
    }

    tokenize(content) {
        const maxCharsLimitInAToken = 12;
        return (content.match(/\S+|\s+/g) || []).flatMap(token => {
            if (token.length <= maxCharsLimitInAToken) return [token];
            // Else Split by maxCharsLimitInAToken
            const chunks = [];
            for (let i = 0; i < token.length; i += maxCharsLimitInAToken) {
                chunks.push(token.slice(i, Math.min(i + maxCharsLimitInAToken, token.length)));
            }
            return chunks;
        });
    }
}