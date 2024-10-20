import { parse } from './markdown-parser';
import { visit } from "unist-util-visit";
import {INDEX_VERSION} from "../constants.js";

export class Splitter {

    constructor(maxTokens = 360) {
        this.maxTokens = maxTokens;
        this.splitResult = [];
        this.noteContent = '';
    }

    addNoteContentSplitResult(note, headers) {
        this.splitResult.push({
            id: note.uuid + "##"+ this.splitResult.length,
            metadata: {
                pageContent: `---\nnote-title: ${note.name}\ncontent-hierarchy: ${headers.map((header) => `${'#'.repeat(header.depth)} ${
                    this.noteContent.substring(header.position.start.offset, header.position.end.offset).trim().replaceAll('\n','')}`).join(', ')}\n---\n`,
                noteUUID: note.uuid,
                namespace: "note-content",
                isTagOnly: false,
                pluginVersion: INDEX_VERSION
            },
            dirty: false
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
            } else if (!['root'].includes(node.type)) {
                const nodeValue = noteContent.substring(node.position.start.offset, node.position.end.offset);
                let nodeTokens = this.tokenize(nodeValue);
                while (nodeTokens.length > 0) {
                    let currentContent = this.splitResult[this.splitResult.length - 1].metadata.pageContent;
                    const remainingSpace = this.maxTokens - this.tokenize(currentContent).length;
                    if (remainingSpace === 0) {
                        this.addNoteContentSplitResult(note, headers);
                        currentContent = this.splitResult[this.splitResult.length - 1].metadata.pageContent;
                    }
                    this.splitResult[this.splitResult.length - 1].metadata.pageContent += nodeTokens.slice(0, remainingSpace).join('');
                    nodeTokens = nodeTokens.slice(remainingSpace);
                    this.splitResult[this.splitResult.length - 1].dirty = true;
                }

                return 'skip';
            }
        });
        this.splitResult = this.splitResult.filter((result) => result.dirty);
        this.splitResult.forEach((result) => delete result.dirty);

        this.splitResult.push({
            id: note.uuid,
            metadata: {
                pageContent: `---\nnote-title: ${note.name}\nnote-tags: ${(note.tags || []).join(", ")}\n---`,
                noteUUID: note.uuid,
                namespace: "note-tags",
                isTagOnly: true,
                pluginVersion: INDEX_VERSION
            }
        });

        return this.splitResult;
    }

    tokenize(content) {
        // Dummy tokenize function, replace with actual implementation
        return content.split(/\s+/).map((token) => token+' ');
    }
}