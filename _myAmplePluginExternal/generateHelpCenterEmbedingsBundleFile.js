import {Splitter} from "../src-copilot/CopilotDB/splitter/Splitter.js";
import {mockApp, mockNote} from "../common-utils/test-helpers.js";
import {getCorsBypassUrl} from "../common-utils/cors-helpers.js";
import {EMBEDDING_API_KEY_SETTING, EMBEDDING_API_URL_SETTING, COPILOT_DB_MAX_TOKENS} from "../src-copilot/constants.js";
const { existsSync } = require('fs');
const { join } = require('path');
const { JSDOM } = require("jsdom");
const parquet = require('parquetjs-lite');
import {fetch} from "cross-fetch";
import {TransformStream} from 'stream/web';
import {cloneDeep} from "lodash-es";
import {OpenAIEmbeddingGenerator} from "../src-copilot/CopilotDB/embeddings/OpenAIEmbeddingGenerator.js";
import {FireworksEmbeddingGenerator} from "../src-copilot/CopilotDB/embeddings/FireworksEmbeddingGenerator.js";
import {OllamaEmbeddingGenerator} from "../src-copilot/CopilotDB/embeddings/OllamaEmbeddingGenerator.js";
import {PineconeEmbeddingGenerator} from "../src-copilot/CopilotDB/embeddings/PineconeEmbeddingGenerator.js";
import {GoogleEmbeddingGenerator} from "../src-copilot/CopilotDB/embeddings/GoogleEmbeddingGenerator.js";

/**
 * This script is used to generate embeddings and store in bundles folder as parquet files.
 * Once generated, the bundles can be published to npm.
 * This can then be imported in plugin and be used to search help center.
 * Usage:
 * manually set PINECONE_API_KEY, OPENAI_API_KEY, FIREWORKS_API_KEY in .env file
 * sudo service ollama stop (for linux)
 * OLLAMA_ORIGINS=https://plugins.amplenote.com ollama serve
 * ollama pull snowflake-arctic-embed:33m-s-fp16 (first time only)
 * npx jest --runTestsByPath ./_myAmplePluginExternal/generateHelpCenterEmbedingsBundleFile.js --passWithNoTests --testMatch "**"
 * Once parquet files are generated, it can be browsed using:
 * https://demo.duckui.com/
 */

const CONFIG = {
    TEST_TIMEOUT: 6000000,
    OUTPUT_PATH: {
        LOCAL: '/bundles/localHelpCenterEmbeddings.parquet',
        PINECONE: '/bundles/pineconeHelpCenterEmbeddings.parquet',
        OPENAI: '/bundles/openaiHelpCenterEmbeddings.parquet',
        FIREWORKS: '/bundles/fireworksHelpCenterEmbeddings.parquet',
        GOOGLE: '/bundles/googleHelpCenterEmbeddings.parquet',
    },
    HELP_CENTER_URLS: [
    ],
    HTTP_HEADERS: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive"
    }
};

async function loadExistingRecords(filePath) {
    try {
        const fullPath = join(__dirname, filePath);
        if (!existsSync(fullPath)) {
            console.log(`No existing records found at ${filePath}`);
            return [];
        }

        const reader = await parquet.ParquetReader.openFile(fullPath);
        const cursor = reader.getCursor();
        const records = [];
        let record;
        while ((record = await cursor.next())) {
            records.push(record);
        }
        await reader.close();
        console.log(`Loaded ${records.length} existing records from ${filePath}`);
        return records;
    } catch (e) {
        console.error(`Error loading existing records from ${filePath}:`, e);
        return [];
    }
}

async function saveRecords(records, filePath) {
    try {
        const fullPath = join(__dirname, filePath);

        const ids = new Set();
        for (const record of records) {
            if (ids.has(record.id)) {
                throw new Error(`Duplicate ID detected: ${record.id}`);
            }
            ids.add(record.id);
        }

        // Define parquet schema using parquetjs-lite
        const schema = new parquet.ParquetSchema({
            'id': { type: 'UTF8' },
            'actualNoteContentPart': { type: 'UTF8' },
            'processedNoteContent': { type: 'UTF8' },
            'embedding': {
              repeated: true,
              type: 'FLOAT'
            },
            'noteUUID': { type: 'UTF8' },
            'noteTitle': { type: 'UTF8' },
            'noteTags': {
              repeated: true,
              type: 'UTF8'
            },
            'headingAnchor': { type: 'UTF8', optional: true },
            'isArchived': { type: 'BOOLEAN' },
            'isPublished': { type: 'BOOLEAN' },
            'isSharedByMe': { type: 'BOOLEAN' },
            'isSharedWithMe': { type: 'BOOLEAN' },
            'isTaskListNote': { type: 'BOOLEAN' }
        });

        // Create parquet writer
        const writer = await parquet.ParquetWriter.openFile(schema, fullPath);

        // Write records
        for (const record of records) {
            if (!record.embedding) throw new Error('Missing embedding detected');
            if (!record.id) throw new Error('Missing id detected');
            if (record.embedding.length === 0) throw new Error('Empty embedding detected');
            await writer.appendRow({
                id: record.id,
                actualNoteContentPart: record.actualNoteContentPart,
                processedNoteContent: record.processedNoteContent,
                embedding: Array.from(record.embedding),
                noteUUID: record.noteUUID,
                noteTitle: record.noteTitle || '',
                noteTags: record.noteTags || [],
                headingAnchor: record.headingAnchor || null,
                isArchived: record.isArchived || false,
                isPublished: record.isPublished || false,
                isSharedByMe: record.isSharedByMe || false,
                isSharedWithMe: record.isSharedWithMe || false,
                isTaskListNote: record.isTaskListNote || false
            });
        }

        await writer.close();
    } catch (e) {
        console.error(`Failed to save records to ${filePath}:`, e);
        throw e;
    }
}

async function getAllHelpCenterLinks() {
    const response = await fetch(getCorsBypassUrl('https://www.amplenote.com/help'), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive"
        }
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const links = dom.window.document.querySelectorAll('.help-page-link');
    const uniqueLinks = new Set();
    for (const link of links) {
        const href = link.getAttribute('href');
        if (href.startsWith('/')) {
            uniqueLinks.add(`https://www.amplenote.com${href}`);
        } else {
            uniqueLinks.add(href);
        }
    }
    return Array.from(uniqueLinks);
}

async function getMarkdownFromAmpleNoteUrl(url) {
    const response = await fetch(getCorsBypassUrl(url), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive"
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch help center link - ${url}: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html);
    const title = dom.window.document.querySelector('.note-name')?.textContent ||
        dom.window.document.querySelector('.help-page-title')?.textContent ||
        dom.window.document.querySelector('.blog-title')?.textContent;
    if (!title) {
        throw new Error(`Failed to get title for ${url}.\nHTML:\n${html}`);
    }
    let markdown = '';
    dom.window.document.querySelectorAll('.material-icons').forEach(icon => icon.remove());
    const htmlContentNodes = Array.from(dom.window.document.querySelectorAll('.html-content .ProseMirror > *'));
    const blogContentNodes = Array.from(dom.window.document.querySelectorAll('.blog-content .ProseMirror > * > *'));
    const nodes = [...htmlContentNodes, ...blogContentNodes];
    for (const node of nodes) {
        if (node.tagName.toLowerCase().startsWith('h')) {
            const level = parseInt(node.tagName.substring(1));
            markdown += `${'#'.repeat(level)} ${node.textContent}\n`;
        }
        else if (node.classList.contains('code-block')) {
            markdown += `\`\`\`\n${node.textContent}\n\`\`\`\n`;
        }
        else {
            for (const imageViewNode of node.querySelectorAll('.image-view')) {
                const imageSrc = imageViewNode.querySelector('img')?.getAttribute('src');
                imageViewNode.outerHTML = `![${imageViewNode.querySelector('img')?.getAttribute('alt')?.trim() || ''}](${imageSrc}) `;
            }
            for (const boldNode of node.querySelectorAll('b')) {
                boldNode.outerHTML = `**${boldNode.textContent}**`;
            }
            for (const linkNode of node.querySelectorAll('a')) {
                linkNode.outerHTML = `[${linkNode.textContent || ''}](${linkNode.getAttribute('href')}) `;
            }
            if (node.tagName.toLowerCase() === 'blockquote') {
                markdown += '> ' + node.textContent + '\n';
            }
            else if (node.classList.contains('number-list-item') || node.classList.contains('bullet-list-item')) {
                let indent = node.classList.toString().split(' ').find(x => x.startsWith('indent-')).split('-')[1];
                indent = parseInt(indent) || 0;
                markdown += `${'\t'.repeat(indent)}${node.textContent}\n`;
            }
            else if (node.classList.contains('table-wrapper')) {
                markdown += '\n';
                for (const tableRow of node.querySelectorAll('tr')) {
                    markdown += '| ';
                    for (const tableCell of tableRow.querySelectorAll('td')) {
                        markdown += tableCell.textContent + ' | ';
                    }
                    markdown += '\n';
                }
            }
            else markdown += node.textContent + '\n';
        }
    }
    return [markdown, title];
}

async function generateEmbeddings(app, records, oldRecords, embedGenerator) {
    // Reuse existing embeddings by matching on actualNoteContentPart
    for (const record of records) {
        const oldRecord = oldRecords.find(old => old.actualNoteContentPart === record.actualNoteContentPart);
        record.embedding = oldRecord ? oldRecord.embedding : [];
    }

    // Generate new embeddings for remaining records
    const remainingRecords = records.filter(record => !record.embedding || record.embedding.length === 0);
    if (remainingRecords.length > 0) {
        const embeddings = await embedGenerator.generateEmbedding(
            app,
            remainingRecords.map(r => r.processedNoteContent),
            'passage'
        );
        embeddings.forEach((embedding, index) => {
            remainingRecords[index].embedding = embedding;
        });
    }

    return records;
}

async function generateHelpCenterEmbeddings() {
    const oldAllRecordsLocal = await loadExistingRecords(CONFIG.OUTPUT_PATH.LOCAL);
    const oldAllRecordsPinecone = await loadExistingRecords(CONFIG.OUTPUT_PATH.PINECONE);
    const oldAllRecordsOpenAI = await loadExistingRecords(CONFIG.OUTPUT_PATH.OPENAI);
    const oldAllRecordsGoogle = await loadExistingRecords(CONFIG.OUTPUT_PATH.GOOGLE);
    const oldAllRecordsFireworks = await loadExistingRecords(CONFIG.OUTPUT_PATH.FIREWORKS);

    const allRecordsLocal = [], allRecordsPinecone = [],
        allRecordsOpenAI = [], allRecordsFireworks = [], allRecordsGoogle = [];

    const ollamaEmbeddingGenerator = new OllamaEmbeddingGenerator();
    const openaiEmbeddingGenerator = new OpenAIEmbeddingGenerator();
    const googleEmbeddingGenerator = new GoogleEmbeddingGenerator();
    const pineconeEmbeddingGenerator = new PineconeEmbeddingGenerator();
    const fireworksEmbeddingGenerator = new FireworksEmbeddingGenerator();

    for (const [i, url] of CONFIG.HELP_CENTER_URLS.entries()) {
        const splitter = new Splitter(COPILOT_DB_MAX_TOKENS);
        const [content, title] = await getMarkdownFromAmpleNoteUrl(url);
        const mockedNote = mockNote(content, title, url);
        const app = mockApp(mockedNote);
        const splitRecords = await splitter.splitNote(app, mockedNote);

        // Set help center specific properties for all records
        splitRecords.forEach(record => {
            record.isArchived = false;
            record.isPublished = true;
            record.isSharedByMe = false;
            record.isSharedWithMe = false;
            record.isTaskListNote = false;
        });

        // Generate local embeddings
        app.settings[EMBEDDING_API_URL_SETTING] = "http://localhost:11434/api";
        const localRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsLocal, ollamaEmbeddingGenerator);
        app.settings[EMBEDDING_API_URL_SETTING] = null;
        allRecordsLocal.push(...localRecords);
        await saveRecords(allRecordsLocal, CONFIG.OUTPUT_PATH.LOCAL);

        // Generate Pinecone embeddings
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.PINECONE_API_KEY;
        const pineconeRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsPinecone, pineconeEmbeddingGenerator);
        allRecordsPinecone.push(...pineconeRecords);
        await saveRecords(allRecordsPinecone, CONFIG.OUTPUT_PATH.PINECONE);

        // Generate OpenAI embeddings
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.OPENAI_API_KEY;
        const openaiRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsOpenAI, openaiEmbeddingGenerator);
        allRecordsOpenAI.push(...openaiRecords);
        await saveRecords(allRecordsOpenAI, CONFIG.OUTPUT_PATH.OPENAI);

        // Generate Google embeddings
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.GOOGLE_API_KEY;
        const googleRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsGoogle, googleEmbeddingGenerator);
        allRecordsGoogle.push(...googleRecords);
        await saveRecords(allRecordsGoogle, CONFIG.OUTPUT_PATH.GOOGLE);

        // Generate Fireworks embeddings
        app.settings[EMBEDDING_API_KEY_SETTING] = process.env.FIREWORKS_API_KEY;
        const fireworksRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsFireworks, fireworksEmbeddingGenerator);
        allRecordsFireworks.push(...fireworksRecords);
        await saveRecords(allRecordsFireworks, CONFIG.OUTPUT_PATH.FIREWORKS);

        console.log('Progress:', i + 1, '/', CONFIG.HELP_CENTER_URLS.length);
    }
}

test('Generate Help Center Embeddings', async () => {
    window.fetch = fetch;
    window.TransformStream = TransformStream;
    CONFIG.HELP_CENTER_URLS = [
        'https://public.amplenote.com/jKhhLtHMaSDGM8ooY4R9MiYi',
        'https://public.amplenote.com/he5yXPoUsXPsYBKbH37vEvZb',
        'https://public.amplenote.com/16oi13jtaNMoSxqjQMKgBdUE',
        'https://public.amplenote.com/SZnCDvp9yU7CbCzkn7RJowcV',
        'https://public.amplenote.com/WykvBZZSXReMcVFRrjrhk4mS',
        ...(await getAllHelpCenterLinks())
    ];
    await generateHelpCenterEmbeddings();
    console.log('Done! Please execute "node ./_myAmplePluginExternal/publish.js" to publish to npm');
}, CONFIG.TEST_TIMEOUT);
