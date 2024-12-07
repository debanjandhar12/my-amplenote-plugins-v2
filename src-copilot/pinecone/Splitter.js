import { parse } from '../markdown/markdown-parser.js';
import { visit } from "unist-util-visit";
import {INDEX_VERSION} from "../constants.js";

export class Splitter {

    constructor(maxTokens = 260) {
        this.maxTokens = maxTokens;
        this.splitResult = [];
        this.noteContent = '';
        this.accountSettingId = 'todo';
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
                namespace: "note-content",
                isTagOnly: false,
                pluginVersion: INDEX_VERSION,
                accountSettingId: this.accountSettingId
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
            } else if (node.type === 'code' && (node.position.end.offset - node.position.start.offset) > this.maxTokens) {
                console.log('Skipping code block due to length', node);
                return 'skip';
            } else {
                const nodeValue = noteContent.substring(node.position.start.offset, node.position.end.offset);
                let nodeTokens = this.tokenize(nodeValue);
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
        this.splitResult = this.splitResult.filter((result) => result.addedAmount > 64);
        this.splitResult.forEach((result) => delete result.dirty);
        this.splitResult.forEach((result) => delete result.addedAmount);

        this.splitResult.push({
            id: note.uuid,
            metadata: {
                pageContent: `---\nnote-title: ${note.name}\nnote-tags: ${(note.tags || []).join(", ")}\n---`,
                noteUUID: note.uuid,
                noteTitle: note.name || note.title || 'Untitled Note',
                noteTags: (note.tags || []).join(", "),
                namespace: "note-tags",
                isTagOnly: true,
                pluginVersion: INDEX_VERSION,
                accountSettingId: this.accountSettingId
            }
        });

        return this.splitResult;
    }

    tokenize(content) {
        // Dummy tokenize function, replace with actual implementation
        return content.split(/\s+/).map((token) => token+' ');
    }
}