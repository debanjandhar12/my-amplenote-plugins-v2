import { parse } from '../../markdown/markdown-parser.js';
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import {isArray, truncate} from "lodash-es";
import {getExtendedNoteHandleProperties} from "../utils/getExtendedNoteHandleProperties.js";

export class Splitter {
    constructor(maxTokens) {
        this.maxTokens = maxTokens;
        this.splitRecordList = [];
        this.noteContent = '';
        this.noteProperties = {};
        this.noteImages = [];
    }

    _addSplitRecord(note, headers, isFirstSplit = false) {
        const lastHeader = headers[headers.length - 1];
        const lastHeaderText = mdastToString(lastHeader);
        
        this.splitRecordList.push({
            id: note.uuid + "##"+ this.splitRecordList.length,
            metadata: {
                noteContentPart: ``,
                noteUUID: note.uuid,
                noteTitle: note.name || note.title || 'Untitled Note',
                noteTags: note.tags || [],
                headingAnchor: lastHeaderText ? lastHeaderText.trim().replaceAll(' ', '_') : null,
                ...this.noteProperties
            },
            tempData: {
                isFirstSplit,
                headers,
                addedTokenCount: 0
            }
        });
    }
    
    _getFrontMatter(splitRecord) {
        const headerHierarchy = splitRecord.tempData.headers && splitRecord.tempData.headers.length > 0 ?
            splitRecord.tempData.headers.map((header) => `${'#'.repeat(header.depth)} ${
            this.noteContent.substring(header.position.start.offset, header.position.end.offset).trim().replaceAll('\n','')}`).join('> ') : '';
        
        return `---\n`+
            `title: ${truncate(splitRecord.metadata.noteTitle, {length: 50})}\n` +
            (splitRecord.tempData.isFirstSplit && splitRecord.metadata.noteTags && isArray(splitRecord.metadata.noteTags) ?
                `tags: ${splitRecord.metadata.noteTags.slice(0, 4).filter(x => x.length < 10).join(', ')}\n` : '') +
            (headerHierarchy && headerHierarchy.length < 120 ? `headers: ${headerHierarchy}\n` : '') +
            `---\n`;
    }

    async _collectNoteInfo(app, note) {
        this.noteContent = await app.getNoteContent({ uuid: note.uuid });
        this.noteProperties = await getExtendedNoteHandleProperties(app, note);
        this.noteImages = await app.getNoteImages({ uuid: note.uuid });
    }

    _rebalanceChunks(rebalanceChunksThreshold) {
        if (rebalanceChunksThreshold < 0 || rebalanceChunksThreshold > 1) throw new Error('rebalanceChunksThreshold must be between 0 and 1');

        const rebalancedChunks = [];
        let currentChunk = null;

        for (const chunk of this.splitRecordList) {
            if (!currentChunk) {
                currentChunk = {...chunk};
                continue;
            }

            // If combining would exceed rebalanceChunksThreshold * maxTokens, store current and start new
            if (currentChunk.tempData.addedTokenCount + chunk.tempData.addedTokenCount > (rebalanceChunksThreshold * this.maxTokens)) {
                rebalancedChunks.push(currentChunk);
                currentChunk = {...chunk};
                continue;
            }

            // Combine chunks
            if (currentChunk.tempData.headers.length === 0 && chunk.tempData.headers.length > 0
                && currentChunk.tempData.addedTokenCount === 0) {
                currentChunk.metadata.headingAnchor = chunk.metadata.headingAnchor;
                currentChunk.tempData.headers = chunk.tempData.headers;
            }
            currentChunk.metadata.noteContentPart += '\n' + chunk.metadata.noteContentPart;
            currentChunk.tempData.addedTokenCount += 1 + chunk.tempData.addedTokenCount;
        }

        if (currentChunk) {
            rebalancedChunks.push(currentChunk);
        }

        this.splitRecordList = rebalancedChunks;
    }

    _enrichChunks() {
        this.splitRecordList = this.splitRecordList
            .filter((result) => result.tempData.addedTokenCount > 0);
        for (const chunk of this.splitRecordList) {
            chunk.metadata.noteContentPart = this._getFrontMatter(chunk) + chunk.metadata.noteContentPart;
            delete chunk.tempData;
        }
    }

    _processTokens(nodeTokens, note, headers) {
        if (nodeTokens.length > this.maxTokens * 1000) {
            return 'skip';
        }

        while (nodeTokens.length > 0) {
            const remainingSpace = this.maxTokens - this.splitRecordList[this.splitRecordList.length - 1].tempData.addedTokenCount;
            if (remainingSpace === 0) {
                this._addSplitRecord(note, headers);
            }
            const addedTokenCount = nodeTokens.slice(0, remainingSpace).length;
            this.splitRecordList[this.splitRecordList.length - 1].metadata.noteContentPart += nodeTokens.slice(0, remainingSpace).join('');
            nodeTokens = nodeTokens.slice(remainingSpace);
            this.splitRecordList[this.splitRecordList.length - 1].tempData.addedTokenCount += addedTokenCount;
        }
        return 'skip';
    }

    async splitNote(app, note, rebalanceChunksThreshold = 0.7) {
        if (note && note.vault) return [];
        if (note && note.uuid && note.uuid.startsWith("local-")) return [];
        this.splitRecordList = [];

        // Step 1: Collect note information
        await this._collectNoteInfo(app, note);

        // Step 2: Parse and create initial splits
        const root = await parse(this.noteContent);
        let headers = [];
        this._addSplitRecord(note, headers, true);
        visit(root, (node) => {
            if (node.type === 'heading') {
                headers = headers.filter((header) => header.depth < node.depth);
                headers.push(node);
                this._addSplitRecord(note, headers);
                const headerText = this.noteContent.substring(node.position.start.offset, node.position.end.offset);
                this.splitRecordList[this.splitRecordList.length - 1].metadata.noteContentPart += headerText + '\n';
                this.splitRecordList[this.splitRecordList.length - 1].tempData.addedTokenCount += this.tokenize(headerText).length + 1;
                return 'skip';
            }
            else if (node.type === 'root' || node.type === 'paragraph') {
                return 'continue';
            }
            else if (node.type === 'code' && node.position &&
                node.position.end.offset - node.position.start.offset > this.maxTokens * 3) {
                console.log('Skipping code block due to length', node);
                return 'skip';
            }
            else if (node.type === 'image' && node.position) {
                const imageObjFromAmplenote = this.noteImages.find((image) => image.src.trim() === node.url.trim());
                let alt = "";
                if (imageObjFromAmplenote && imageObjFromAmplenote.text) {
                    alt = imageObjFromAmplenote.text.replaceAll('\n', ' ');
                }
                const nodeValue = `![${alt.substring(0, 4000)}](${node.url})`;
                let nodeTokens = this.tokenize(nodeValue);
                return this._processTokens(nodeTokens, note, headers);
            }
            else {
                const nodeValue = node.position ?
                    this.noteContent.substring(node.position.start.offset, node.position.end.offset)
                    : mdastToString(node);

                let nodeTokens = this.tokenize(nodeValue);
                return this._processTokens(nodeTokens, note, headers);
            }
        });

        // Step 3: Rebalance chunks if requested
        this._rebalanceChunks(rebalanceChunksThreshold);

        // Step 4: Enrich with front-matter and delete tempData
        this._enrichChunks();

        return this.splitRecordList;
    }

    tokenize(content) {
        const maxCharsLimitInAToken = 12;
        return (content.match(/\S+|\s+/g) || []).flatMap(token => {
            if (token.length <= maxCharsLimitInAToken) return [token];
            const chunks = [];
            for (let i = 0; i < token.length; i += maxCharsLimitInAToken) {
                chunks.push(token.slice(i, Math.min(i + maxCharsLimitInAToken, token.length)));
            }
            return chunks;
        });
    }
}

// TODO: Images with uuids such as https://images.amplenote.com/4872eeba-7596-11e8-bf60-c6c7cb6d06a5/17d64c1a-af4e-4213-86a1-028350fa1978
// consume a lot of tokens. Need to find a way to remove them when generating embeddings.