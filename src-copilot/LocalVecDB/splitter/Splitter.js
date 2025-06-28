import { parse } from '../../markdown/markdown-parser.js';
import { visitParents } from "unist-util-visit-parents";
import { toString as mdastToString } from "mdast-util-to-string";
import { isArray, truncate } from "lodash-es";
import { getExtendedNoteHandleProperties } from "../utils/getExtendedNoteHandleProperties.js";

export class Splitter {
    constructor(maxTokens) {
        if (!maxTokens || maxTokens <= 0) { // Added !maxTokens check for safety
            throw new Error('maxTokens must be a positive integer');
        }
        this.maxTokens = maxTokens;
        this.splitRecordList = [];
        this.noteContent = '';
        this.noteProperties = {};
        this.noteImages = [];
    }

    _createNewChunk(note, headers, isFirstSplit = false) {
        const lastHeader = headers.length > 0 ? headers[headers.length - 1] : null;
        const lastHeaderText = lastHeader ? mdastToString(lastHeader) : '';

        return {
            id: note.uuid + "##" + Math.ceil(Math.random()*10000000),
            actualNoteContentPart: ``,
            processedNoteContent: ``,
            noteUUID: note.uuid,
            noteTitle: note.name || note.title || 'Untitled Note',
            noteTags: note.tags || [],
            headingAnchor: lastHeaderText ? lastHeaderText.trim().replaceAll(' ', '_') : null,
            embeddings: [],
            ...this.noteProperties,
            tempData: {
                isFirstSplit,
                headers,
                addedTokenCount: 0,
                startOffset: null,
                endOffset: null
            }
        };
    }

    _getFrontMatter(splitRecord) {
        const headerHierarchy = splitRecord.tempData.headers?.length > 0 ?
            splitRecord.tempData.headers.map(header => `${'#'.repeat(header.depth)} ${mdastToString(header)}`).join(' > ')
            : '';

        return `---\n` +
            `title: ${truncate(splitRecord.noteTitle, { length: 50 })}\n` +
            (splitRecord.tempData.isFirstSplit && splitRecord.noteTags && isArray(splitRecord.noteTags) ?
                `tags: ${splitRecord.noteTags.slice(0, 4).filter(x => x.length < 10).join(', ')}\n` : '') +
            (headerHierarchy ? `headers: ${truncate(headerHierarchy, { length: 64 })}\n` : '') +
            `---\n`;
    }

    async _collectNoteInfo(app, note) {
        this.noteContent = await app.getNoteContent({ uuid: note.uuid });
        this.noteProperties = await getExtendedNoteHandleProperties(app, note);
        this.noteImages = await app.getNoteImages({ uuid: note.uuid });
    }

    /**
     * Appends content to the current chunk, handling tokenization and overflow.
     * Includes a safeguard against infinite loops.
     */
    _appendContentToChunk(cleanedContent, currentChunk, note, node) {
        if (!cleanedContent) return currentChunk;

        const hasPosition = node && node.position && typeof node.position.start?.offset === 'number' && typeof node.position.end?.offset === 'number';

        // Track the original note substring range when position info is available
        if (hasPosition) {
            if (currentChunk.tempData.startOffset === null) {
                currentChunk.tempData.startOffset = node.position.start.offset;
            }
            currentChunk.tempData.endOffset = node.position.end.offset;
        }

        let tokens = this.tokenize(cleanedContent);

        while (tokens.length > 0) {
            const remainingSpace = this.maxTokens - currentChunk.tempData.addedTokenCount;

            if (remainingSpace <= 0) {
                // If the chunk is full, we must push it and start a new one.
                this.splitRecordList.push(currentChunk);
                currentChunk = this._createNewChunk(note, currentChunk.tempData.headers);
                continue;
            }

            const tokensToAdd = tokens.slice(0, remainingSpace);

            if (tokensToAdd.length === 0 && tokens.length > 0) {    // safeguard against infinite loop
                break;
            }

            const contentToAdd = tokensToAdd.join('');
            currentChunk.processedNoteContent += contentToAdd;
            currentChunk.tempData.addedTokenCount += tokensToAdd.length;
            tokens = tokens.slice(tokensToAdd.length);
        }
        return currentChunk;
    }


    async splitNote(app, note, rebalanceChunksThreshold = 0.7) {
        if (note?.vault || note?.uuid?.startsWith("local-")) return [];

        this.splitRecordList = [];
        await this._collectNoteInfo(app, note);
        if (typeof this.noteContent !== 'string') {
            console.warn(`[Splitter] Note content is not a string for note ${note.uuid}. Skipping chunking.`);
            return [];
        }
        
        if (this.noteContent.length === 0) {
            return [];
        }

        const root = await parse(this.noteContent.substring(0, this.maxTokens * 630)); // max 210 splits
        let currentChunk = this._createNewChunk(note, [], true);

        let processedNodeCount = 0;
        const MAX_NODES_TO_PROCESS = 50000; // Limit to prevent freezing on huge/malformed notes
        visitParents(root, (node, ancestors) => {
            if (++processedNodeCount > MAX_NODES_TO_PROCESS) {
                console.warn(`[Splitter] Exceeded MAX_NODES_TO_PROCESS for note ${note.uuid}. Halting traversal to prevent performance issues.`);
                return false; // Terminate the `visit` traversal
            }

            const parent = ancestors[ancestors.length - 1];
            const currentHeaders = ancestors.filter(a => a.type === 'heading');

            if (node.type === 'heading') {
                // Create a new chunk if there is content in the previous chunk
                const headersIncludingCurrent = [...currentHeaders, node];
                if (currentChunk.tempData.addedTokenCount > 0) {
                    this.splitRecordList.push(currentChunk);
                    currentChunk = this._createNewChunk(note, headersIncludingCurrent);
                } else {
                    // If the current chunk is empty, preserve isFirstSplit flag and update headers
                    const wasFirstSplit = currentChunk.tempData.isFirstSplit;
                    currentChunk = this._createNewChunk(note, headersIncludingCurrent, wasFirstSplit);
                }
                const headerText = mdastToString(node) + '\n';
                currentChunk = this._appendContentToChunk(headerText, currentChunk, note, node);
                return 'skip';
            }

            if (node.type === 'code' && node.position &&
                node.position.end.offset - node.position.start.offset > this.maxTokens * 6) {
                console.warn('[Splitter] Skipping code block due to length', node);
                return 'skip';
            }

            if (['root', 'paragraph', 'listItem'].includes(node.type)) {
                return 'continue';
            }

            let cleanedText;

            if (node.type === 'image') {
                const imageObj = this.noteImages.find(img => img.src.trim() === node.url.trim());
                const alt = imageObj?.text?.replaceAll('\n', ' ') || node.alt || '';
                cleanedText = `[Image: ${truncate(alt, { length: 128 })}]`;
            }
            else if (node.type === 'link') {
                let alt = ``;
                if (node.children?.length > 0) {
                    try {
                        alt = mdastToString(node.children[0], {includeHtml: false});
                    } catch (e) {}
                }
                try {
                    // Keep only origin
                    const url = new URL(node.url);
                    cleanedText = `[${alt}](${url.origin})\``;
                } catch (e) {cleanedText = `[${alt}](${node.url})`;}
            }
            else {
                try {
                    cleanedText = mdastToString(node, {includeHtml: false});
                } catch (e) {
                    console.warn(`[Splitter] Failed to convert node to string for note ${note.uuid}. Skipping chunking.`);
                    return 'skip';
                }
            }

            const isBlock = parent && parent.children?.includes(node) && !['text', 'inlineCode'].includes(node.type);
            if (isBlock) {
                cleanedText += '\n';
            }

            currentChunk = this._appendContentToChunk(cleanedText, currentChunk, note, node);

            return 'skip';
        });

        if (currentChunk.tempData.addedTokenCount > 0) {
            this.splitRecordList.push(currentChunk);
        }


        if (this.splitRecordList.length > 1) {
            this._rebalanceChunks(rebalanceChunksThreshold);
        }



        this._enrichChunks();

        return this.splitRecordList;
    }
    _rebalanceChunks(rebalanceChunksThreshold) {
        if (rebalanceChunksThreshold < 0 || rebalanceChunksThreshold > 1) throw new Error('rebalanceChunksThreshold must be between 0 and 1');
        if (this.splitRecordList.length < 2) return;

        const rebalancedChunks = [];
        let accumulator = this.splitRecordList[0];

        for (let i = 1; i < this.splitRecordList.length; i++) {
            const nextChunk = this.splitRecordList[i];
            const combinedTokenCount = accumulator.tempData.addedTokenCount + nextChunk.tempData.addedTokenCount;

            if (combinedTokenCount < this.maxTokens && nextChunk.tempData.addedTokenCount < this.maxTokens * rebalanceChunksThreshold) {
                accumulator.processedNoteContent += '\n' + nextChunk.processedNoteContent;
                if (accumulator.tempData.startOffset != null && nextChunk.tempData.endOffset != null) {
                    accumulator.tempData.endOffset = nextChunk.tempData.endOffset;
                }
                accumulator.tempData.addedTokenCount = combinedTokenCount + 1;
            } else {
                rebalancedChunks.push(accumulator);
                accumulator = nextChunk;
            }
        }
        rebalancedChunks.push(accumulator);
        this.splitRecordList = rebalancedChunks;
    }

    _enrichChunks() {
        this.splitRecordList = this.splitRecordList.filter(chunk => chunk.tempData.addedTokenCount > 0);

        for (const chunk of this.splitRecordList) {
            if (chunk.tempData.startOffset != null && chunk.tempData.endOffset != null) {
                chunk.actualNoteContentPart = this.noteContent.substring(chunk.tempData.startOffset, chunk.tempData.endOffset);
            }

            chunk.processedNoteContent = (this._getFrontMatter(chunk) + chunk.processedNoteContent).trim();
            chunk.actualNoteContentPart = (chunk.actualNoteContentPart || chunk.processedNoteContent).trim();
            delete chunk.tempData;
        }
    }

    tokenize(content) { // Simple tokenizer
        const maxCharsLimitInAToken = 12;
        return (content.match(/[\w]+|[^\s\w]|\s+/g) || []).flatMap(token => {
            if (token.length <= maxCharsLimitInAToken) return [token];
            const chunks = [];
            for (let i = 0; i < token.length; i += maxCharsLimitInAToken) {
                chunks.push(token.slice(i, i + maxCharsLimitInAToken));
            }
            return chunks;
        });
    }
}