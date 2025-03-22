import {Splitter} from "../src-copilot/LocalVecDB/splitter/Splitter";
import {mockApp, mockNote} from "../common-utils/test-helpers";
import {getCorsBypassUrl} from "../common-utils/cors-helpers";
import {LOCAL_VEC_DB_MAX_TOKENS, PINECONE_API_KEY_SETTING} from "../src-copilot/constants";
import {generateEmbeddingUsingOllama} from "../src-copilot/LocalVecDB/embeddings/generateEmbeddingUsingOllama";
import {generateEmbeddingUsingPinecone} from "../src-copilot/LocalVecDB/embeddings/generateEmbeddingUsingPinecone";
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { JSDOM } = require("jsdom");
import {fetch} from "cross-fetch";
import {TransformStream} from 'stream/web';
import {compressSync, decompressSync} from "fflate";
import {cloneDeep} from "lodash-es";

/**
 * This script is used to generate embeddings and store in bundles folder as json files.
 * Once generated, the bundles can be published to npm.
 * This can then be imported in plugin and be used to search help center.
 * Usage:
 * manually set PINECONE_API_KEY in .env file
 * sudo service ollama stop (for linux)
 * OLLAMA_ORIGINS=https://plugins.amplenote.com ollama serve
 * ollama pull snowflake-arctic-embed:33m-s-fp16 (first time only)
 * npx jest --runTestsByPath ./_myAmplePluginExternal/generateHelpCenterEmbedingsBundleFile.js --passWithNoTests --testMatch "**"
 */

const CONFIG = {
    TEST_TIMEOUT: 6000000,
    OUTPUT_PATH: {
        LOCAL: '/bundles/localHelpCenterEmbeddings.json.gz',
        PINECONE: '/bundles/pineconeHelpCenterEmbeddings.json.gz'
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
        const compressedContent = readFileSync(join(__dirname, filePath));
        const decompressed = decompressSync(compressedContent);
        const content = new TextDecoder().decode(decompressed);
        return JSON.parse(content);
    } catch (e) {
        console.log(`No existing records found at ${filePath}`);
        return [];
    }
}

async function saveRecords(records, filePath) {
    try {
        const content = JSON.stringify(records);
        const compressed = compressSync(new TextEncoder().encode(content));
        writeFileSync(join(__dirname, filePath), compressed);
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
    // Reuse existing embeddings
    for (const record of records) {
        const oldRecord = oldRecords.find(old => old.metadata.noteContentPart === record.metadata.noteContentPart);
        record.values = oldRecord ? oldRecord.values : null;
    }

    // Generate new embeddings for remaining records
    const remainingRecords = records.filter(record => !record.values);
    if (remainingRecords.length > 0) {
        const embeddings = await embedGenerator(
            app,
            remainingRecords.map(r => r.metadata.noteContentPart),
            'passage'
        );
        embeddings.forEach((embedding, index) => {
            remainingRecords[index].values = embedding;
        });
    }

    return records;
}

async function generateHelpCenterEmbeddings() {
    const oldAllRecordsLocal = await loadExistingRecords(CONFIG.OUTPUT_PATH.LOCAL);
    const oldAllRecordsPinecone = await loadExistingRecords(CONFIG.OUTPUT_PATH.PINECONE);

    const allRecordsLocal = [], allRecordsPinecone = [];

    for (const [i, url] of CONFIG.HELP_CENTER_URLS.entries()) {
        const splitter = new Splitter(LOCAL_VEC_DB_MAX_TOKENS);
        const [content, title] = await getMarkdownFromAmpleNoteUrl(url);
        const mockedNote = mockNote(content, title, url);
        const app = mockApp(mockedNote);
        const splitRecords = await splitter.splitNote(app, mockedNote);

        // Generate local embeddings
        const localRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsLocal, generateEmbeddingUsingOllama);
        allRecordsLocal.push(...localRecords);
        await saveRecords(allRecordsLocal, CONFIG.OUTPUT_PATH.LOCAL);

        // Generate Pinecone embeddings
        app.settings[PINECONE_API_KEY_SETTING] = process.env.PINECONE_API_KEY;
        const pineconeRecords = await generateEmbeddings(app, cloneDeep(splitRecords), oldAllRecordsPinecone, generateEmbeddingUsingPinecone);
        allRecordsPinecone.push(...pineconeRecords);
        await saveRecords(allRecordsPinecone, CONFIG.OUTPUT_PATH.PINECONE);

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
        ...(await getAllHelpCenterLinks())
    ];
    await generateHelpCenterEmbeddings();
    console.log('Done! Please execute "node ./_myAmplePluginExternal/publish.js" to publish to npm');
}, CONFIG.TEST_TIMEOUT);