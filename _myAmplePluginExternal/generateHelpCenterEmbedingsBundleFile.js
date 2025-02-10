import {Splitter} from "../src-copilot/LocalVecDB/splitter/Splitter";
import {mockApp, mockNote} from "../common-utils/test-helpers";
import {fetch} from "cross-fetch";
import {getCorsBypassUrl} from "../common-utils/cors-helpers";
import {LOCAL_VEC_DB_MAX_TOKENS} from "../src-copilot/constants";
import {generateEmbeddingUsingOllama} from "../src-copilot/LocalVecDB/embeddings/generateEmbeddingUsingOllama";
import {generateEmbeddingUsingPinecone} from "../src-copilot/LocalVecDB/embeddings/generateEmbeddingUsingPinecone";
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { TransformStream } = require('stream/web');
const { JSDOM } = require("jsdom");

/**
 * This script is used to generate embeddings and store in bundles folder as json files.
 * Once generated, the bundles can be published to npm.
 * This can then be imported in plugin and be used to search help center.
 * Usage:
 * sudo service ollama stop (for linux)
 * OLLAMA_ORIGINS=https://plugins.amplenote.com ollama serve
 * ollama pull snowflake-arctic-embed:33m-s-fp16
 * npx jest --runTestsByPath ./_myAmplePluginExternal/generateHelpCenterEmbedingsBundleFile.js --passWithNoTests --testMatch "**"
 */
const helpCenterUrls = [
    'https://www.amplenote.com/help/developing_amplenote_plugins'
]

async function getMarkdownFromAmpleNoteUrl(url) {
    const response = await fetch(getCorsBypassUrl(url), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive"
        }
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const title = dom.window.document.querySelector('.note-name')?.textContent ||
        dom.window.document.querySelector('.help-page-title')?.textContent;
    if (!title) {
        throw new Error(`Failed to get title for ${url}.\nHTML:\n${html}`);
    }
    let markdown = '';
    dom.window.document.querySelectorAll('.material-icons').forEach(icon => icon.remove());
    for (const node of dom.window.document.querySelectorAll('.html-content .ProseMirror > *')) {
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
                imageViewNode.outerHTML = `![${imageViewNode.querySelector('img')?.getAttribute('alt') || ''}](${imageSrc}) `;
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

async function generateHelpCenterEmbeddings() {
    const oldAllRecordsLocal = [];
    const oldAllRecordsPinecone = [];
    try {
        oldAllRecordsLocal.push(...JSON.parse(readFileSync(join(__dirname, '/bundles/localHelpCenterEmbeddings.json'))));
    } catch (e) {}
    try {
        oldAllRecordsPinecone.push(...JSON.parse(readFileSync(join(__dirname, '/bundles/pineconeHelpCenterEmbeddings.json'))));
    } catch (e) {}
    const allRecordsLocal = [], allRecordsPinecone = [];
    for (const url of helpCenterUrls) {
        const splitter = new Splitter(LOCAL_VEC_DB_MAX_TOKENS);
        const [content, title] = await getMarkdownFromAmpleNoteUrl(url);
        const mockedNote = mockNote(content, title, url);
        const app = mockApp(mockedNote);
        const splitRecords = await splitter.splitNote(app, mockedNote);

        // -- Generate embeddings for local model --
        // Use old embeddings if available
        for (const splitRecord of splitRecords) {
            const oldRecord = oldAllRecordsLocal.find(oldRecord => oldRecord.metadata.noteContentPart === splitRecord.metadata.noteContentPart);
            if (oldRecord) {
                splitRecord.values = oldRecord.values;
            }
            else splitRecord.values = null;
        }

        // Generate embeddings for rest of the records
        const remainingRecords = splitRecords.filter(splitRecord => !splitRecord.values);
        const embeddingArr = await generateEmbeddingUsingOllama(app, remainingRecords.map(splitRecord => splitRecord.metadata.noteContentPart), 'passage');
        embeddingArr.forEach((embedding, index) => {
            remainingRecords[index].values = embedding;
        });

        // Push and write to file
        allRecordsLocal.push(...splitRecords);
        writeFileSync(join(__dirname, '/bundles/localHelpCenterEmbeddings.json'), JSON.stringify(allRecordsLocal, null, 1));

        // -- Generate embeddings for pinecone model --
        // Use old embeddings if available
        for (const splitRecord of splitRecords) {
            const oldRecord = oldAllRecordsPinecone.find(oldRecord => oldRecord.metadata.noteContentPart === splitRecord.metadata.noteContentPart);
            if (oldRecord) {
                splitRecord.values = oldRecord.values;
            }
            else splitRecord.values = null;
        }

        // Generate embeddings for rest of the records
        const remainingRecords2 = splitRecords.filter(splitRecord => !splitRecord.values);
        const embeddingArr2 = await generateEmbeddingUsingPinecone(app, remainingRecords2.map(splitRecord => splitRecord.metadata.noteContentPart), 'passage');
        embeddingArr2.forEach((embedding, index) => {
            remainingRecords2[index].values = embedding;
        });

        // Push and write to file
        allRecordsPinecone.push(...splitRecords);
        writeFileSync(join(__dirname, '/bundles/pineconeHelpCenterEmbeddings.json'), JSON.stringify(allRecordsPinecone, null, 1));
    }
}


test('', async () => {
    window.TransformStream = TransformStream;
    window.fetch = fetch;
    await generateHelpCenterEmbeddings();
    console.log('Done! Please execute "node ./_myAmplePluginExternal/publish.js" to publish to npm');
}, 600000);