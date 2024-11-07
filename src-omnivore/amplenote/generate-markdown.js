import {
    AMPLENOTE_INSERT_CONTENT_LIMIT,
    NOTE_HIGHLIGHT_ORDER_SETTING,
    NOTE_HIGHLIGHT_ORDER_SETTING_DEFAULT,
    OMNIVORE_DASHBOARD_COLUMNS_SETTING,
    OMNIVORE_DASHBOARD_ORDER_SETTING,
    OMNIVORE_DASHBOARD_ORDER_SETTING_DEFAULT,
} from "../constants.js";
import {sortOmnivoreItems, sortOmnivoreItemHighlights} from "./util.js";
import {telegramMarkdownEscape} from "@yiuayiu/telegram-markdown-escape";
import {getOmnivoreAppUrl} from "../omnivore/getOmnivoreUrl.js";

// Generate dashboard table for Dashboard note
export async function generateDashboardTable(omnivoreItemsState, appSettings, getNoteUrlFromTitle) {
    let optionalColumns = (appSettings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] || '').split(',').map(c => c.trim()) || [];
    optionalColumns = optionalColumns.filter(c => ['Author', 'Description', 'UpdatedAt', 'SavedAt', 'PageType', 'ReadingProgressPercent'].includes(c));
    const headers = '|**Cover**|**Title**'
        + `${optionalColumns.includes('Author') ? '|**Author**' : ''}`
        + `${optionalColumns.includes('Description') ? '|**Description**' : ''}`
        + `${optionalColumns.includes('UpdatedAt') ? '|**Updated At**' : ''}`
        + `${optionalColumns.includes('SavedAt') ? '|**Saved At**' : ''}`
        + `${optionalColumns.includes('PageType') ? '|**Page Type**' : ''}`
        + `${optionalColumns.includes('ReadingProgressPercent') ? '|**Reading Progress Percent**' : ''}`
        + '|**Omnivore Link**'
        + '|';
    const separator = '|---|---'
        + `${optionalColumns.map(() => '|---').join('')}`
        + '|---'
        + '|';
    const omnivoreItemsStateSorted = sortOmnivoreItems(omnivoreItemsState, appSettings[OMNIVORE_DASHBOARD_ORDER_SETTING]
        || OMNIVORE_DASHBOARD_ORDER_SETTING_DEFAULT);
    const rows = await Promise.all(omnivoreItemsStateSorted.map(async note => {
        const row = `|![\\|180](${note.image})`
            + `|${note.url ? `[${telegramMarkdownEscape(note.title || '')}](${await getNoteUrlFromTitle(note.title)})` : telegramMarkdownEscape(note.title || '')}`
            + `${optionalColumns.includes('Author') ? `|${telegramMarkdownEscape(note.author || '')}` : ''}`
            + `${optionalColumns.includes('Description') ? `|${telegramMarkdownEscape(note.description || '')}` : ''}`
            + `${optionalColumns.includes('UpdatedAt') ? `|${new Date(note.updatedAt).toLocaleString()}` : ''}`
            + `${optionalColumns.includes('SavedAt') ? `|${new Date(note.savedAt).toLocaleString()}` : ''}`
            + `${optionalColumns.includes('PageType') ? `|${note.pageType}` : ''}`
            + `${optionalColumns.includes('ReadingProgressPercent') ? `|${note.readingProgressPercent}%` : ''}`
            + `|[Omnivore Link](${
                getOmnivoreAppUrl(appSettings)
            }/me/${note.slug})`
            + '|';
        return row;
    }));

    let result = ['# Omnivore Dashboard\n'];
    let currentChunk = '';
    let currentChunkLength = 0;
    let pageIndex = 1;

    rows.forEach(row => {
        const rowLength = [headers, separator, row].join('\n').length;
        if (currentChunkLength + rowLength > AMPLENOTE_INSERT_CONTENT_LIMIT) {
            result.push(`### Page ${pageIndex}\n` + [headers, separator, currentChunk].join('\n') + '\n');
            currentChunk = '';
            currentChunkLength = 0;
            pageIndex += 1;
        }
        if (row.length < AMPLENOTE_INSERT_CONTENT_LIMIT) {
            currentChunk += row + '\n';
            currentChunkLength += rowLength;
        }
        else {} // Ignore rows that are too long
    });

    if (currentChunk) {
        result.push(`### Page ${pageIndex}\n` + [headers, separator, currentChunk].join('\n') + '\n');
    }

    return result;
}

// Generate highlight section for the Highlight note
export function generateNoteHighlightSectionMarkdown(omnivoreItemsState, appSettings) {
    const highlights = omnivoreItemsState.highlights || [];
    const highlightsSorted = sortOmnivoreItemHighlights(highlights, appSettings[NOTE_HIGHLIGHT_ORDER_SETTING]
        || NOTE_HIGHLIGHT_ORDER_SETTING_DEFAULT);
    const properHighlights = highlightsSorted.map(highlight => {
       if (!highlight.quote) return null;
        return `**Highlight [↗️](${getOmnivoreAppUrl(appSettings)}/me/${omnivoreItemsState.slug}#${highlight.id}):**\n` +
            `> ${getHighlightUnicodeIcon(highlight.color)} ${(highlight.quote.split('\n').join(' ')).replace(/>/g, "\\>").replace(/\|/g, "\\|").replace(/^(#{1,6}) /g, "\\$1 ")}\n` +
            (highlight.annotation != null && highlight.annotation !== '' ? `> > 📝 ${(highlight.annotation.split('\n').join(' ').replace(/>/g, "\\>").replace(/\|/g, "\\|")).replace(/^(#{1,6}) /g, "\\$1 ")}\n` : '');
    }).filter(h => h);
    if (properHighlights.length === 0) {
        return `(No highlights - [create one](${getOmnivoreAppUrl(appSettings)}/me/${omnivoreItemsState.slug}))`;
    }
    return properHighlights.join('\n');
}

// Generate summary section for the Highlight note
export function generateNoteSummarySectionMarkdown(omnivoreItemsState, appSettings) {
    return `![\\|180](${omnivoreItemsState.image})\n` +
           `- **Author:** ${(omnivoreItemsState.author || '').replace(/>/g, "\\>").replace(/\|/g, "\\|").replace(/^(#{1,6}) /g, "\\$1 ")}\n` +
           `- **Description:** ${(omnivoreItemsState.description || '').replace(/>/g, "\\>").replace(/\|/g, "\\|").replace(/^(#{1,6}) /g, "\\$1 ")}\n` +
           `- **Page Type:** ${omnivoreItemsState.pageType}\n` +
           `- **Updated At:** ${new Date(omnivoreItemsState.updatedAt).toLocaleString()}\n` +
           `- **Saved At:** ${new Date(omnivoreItemsState.savedAt).toLocaleString()}\n` +
           `- **Reading Progress Percent:** ${omnivoreItemsState.readingProgressPercent} / 100\n`;
}

export function getHighlightUnicodeIcon(color) {
    color = (color || 'yellow').toLowerCase();
    switch (color) {
        case "yellow":
            return "🟡";
        case "red":
            return "🔴";
        case "blue":
            return "🔵";
        case "green":
            return "🟢";
        default:
            return "⚫️";
    }
}