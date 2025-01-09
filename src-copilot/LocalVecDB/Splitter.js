import { parse } from '../markdown/markdown-parser.js';
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import { truncate } from "lodash-es";

export class Splitter {
    constructor(maxTokens) {
        this.maxTokens = maxTokens;
        this.splitRecordList = [];
        this.noteContent = '';
        this.noteProperties = {};
    }

    addSplitRecord(note, headers, isFirstSplit = false) {
        const lastHeader = headers[headers.length - 1];
        const lastHeaderText = this.noteContent.substring(lastHeader.position.start.offset, lastHeader.position.end.offset).trim().replaceAll('\n','');
        this.splitRecordList.push({
            id: note.uuid + "##"+ this.splitRecordList.length,
            metadata: {
                pageContentPart: ``,
                noteUUID: note.uuid,
                noteTitle: note.name || note.title || 'Untitled Note',
                noteTags: (note.tags || []).join(", "),
                headingAnchor: lastHeaderText.replaceAll(' ', '_'),
                ...this.noteProperties
            },
            tempData: {
                isFirstSplit,
                headers,
                addedAmount: 0, // Amount of content added to this split result
            }
        });
    }
    
    getFrontMatter(splitRecord) {
        const headerHierarchy = splitRecord.tempData.headers ?
            splitRecord.tempData.headers.map((header) => `${'#'.repeat(header.depth)} ${
            this.noteContent.substring(header.position.start.offset, header.position.end.offset).trim().replaceAll('\n','')}`).join('> ') : '';
        return `---\n`+
            `title: ${truncate(splitRecord.metadata.noteTitle, {length: 50})}\n` +
            (splitRecord.tempData.isFirstSplit ? `tags: ${splitRecord.metadata.noteTags.subset(0, 4).filter(x => x.length < 10).join(', ')}\n` : '') +
            (headerHierarchy && headerHierarchy.length < 120 ? `headers: ${headerHierarchy}\n` : '') +
            `---\n`;
    }

    async splitNote(app, note) {
        if (note.vault) return [];
        if (note.uuid.startsWith("local-")) return [];
        this.splitRecordList = [];

        // Collect note information
        this.noteContent = await app.getNoteContent({ uuid: note.uuid });
        const isArchivedSearch = await app.filterNotes({group: "archived",query: note.uuid});
        const isArchived = isArchivedSearch && isArchivedSearch.length > 0;
        const isDailyJot = note.tags && note.tags.includes("daily-jot");
        const isSharedByMeSearch = await app.filterNotes({group: "shared",query: note.uuid});
        const isSharedByMe = isSharedByMeSearch && isSharedByMeSearch.length > 0;
        const isSharedWithMeSearch = await app.filterNotes({group: "shareReceived",query: note.uuid});
        const isSharedWithMe = isSharedWithMeSearch && isSharedWithMeSearch.length > 0;
        this.noteProperties = { isArchived, isDailyJot, isSharedByMe, isSharedWithMe,
            isPublished: note.published };

        // Parse and create split results
        const root = await parse(this.noteContent);
        let headers = [];
        this.addSplitRecord(note, headers);
        visit(root, (node) => {
            if (node.type === 'heading') {
                headers = headers.filter((header) => header.depth < node.depth);
                headers.push(node);
                this.addSplitRecord(note, headers);
                return 'skip';
            } else if (node.type === 'root' || node.type === 'paragraph') {
                return true;    // Continue
            } else if (node.type === 'code' && node.position &&
                node.position.end.offset - node.position.start.offset > this.maxTokens) {
                console.log('Skipping code block due to length', node);
                return 'skip';
            } else {
                const nodeValue = node.position ?
                    this.noteContent.substring(node.position.start.offset, node.position.end.offset)
                    : mdastToString(node);

                let nodeTokens = this.tokenize(nodeValue);
                if (nodeTokens.length > this.maxTokens * 1000) {
                    console.log('Skipping else node due to length', node);
                    return 'skip';
                }
                while (nodeTokens.length > 0) {
                    let currentContent = this.splitRecordList[this.splitRecordList.length - 1].metadata.pageContentPart;
                    const remainingSpace = this.maxTokens - this.tokenize(currentContent).length;
                    if (remainingSpace === 0) {
                        this.addSplitRecord(note, headers);
                        currentContent = this.splitRecordList[this.splitRecordList.length - 1].metadata.pageContentPart;
                    }
                    const addedAmount = nodeTokens.slice(0, remainingSpace).join('').length;
                    this.splitRecordList[this.splitRecordList.length - 1].metadata.pageContentPart += nodeTokens.slice(0, remainingSpace).join('');
                    nodeTokens = nodeTokens.slice(remainingSpace);
                    this.splitRecordList[this.splitRecordList.length - 1].addedAmount += addedAmount;
                }
                return 'skip';
            }
        });
        this.splitRecordList = this.splitRecordList.filter((result) => result.addedAmount > 8);
        this.splitRecordList.forEach((result) => delete result.addedAmount);

        return this.splitRecordList;
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