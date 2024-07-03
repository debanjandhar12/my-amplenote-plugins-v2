import {OMNIVORE_APP_URL, OMNIVORE_DASHBOARD_COLUMNS_SETTING} from "../constants.js";

export async function generateDashboardTable(omnivoreItemsState, appSettings, getNoteUrlFromTitle) {
    const optionalColumns = appSettings[OMNIVORE_DASHBOARD_COLUMNS_SETTING].split(',').map(c => c.trim()) || [];
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
    const rows = await Promise.all(omnivoreItemsState.map(async note => {
        const row = `|![\\|180](${note.image})`
            + `|${note.url ? `[${note.title}](${await getNoteUrlFromTitle(note.title)})` : note.title}`
            + `${optionalColumns.includes('Author') ? `|${note.author}` : ''}`
            + `${optionalColumns.includes('Description') ? `|${note.description}` : ''}`
            + `${optionalColumns.includes('UpdatedAt') ? `|${note.updatedAt}` : ''}`
            + `${optionalColumns.includes('SavedAt') ? `|${note.savedAt}` : ''}`
            + `${optionalColumns.includes('PageType') ? `|${note.pageType}` : ''}`
            + `${optionalColumns.includes('ReadingProgressPercent') ? `|${note.readingProgressPercent}%` : ''}`
            + `|[Omnivore Link](${OMNIVORE_APP_URL}/${note.slug})`
            + '|';
        return row;
    }));
    return [headers, separator, ...rows].join('\n');
}

// Generate highlight section for the Highlight note
export function generateNoteHighlightSectionMarkdown(omnivoreItemsState, appSettings) {
    const highlights = omnivoreItemsState.highlights || [];
    const properHighlights = highlights.map(highlight => {
       if (!highlight.quote) return null;
       return `**Highlight [↗️](${OMNIVORE_APP_URL}/me/${omnivoreItemsState.slug}#${highlight.id}):**\n`+
              `> ${highlight.quote.split('\n').join(' ')}\n`;
    }).filter(h => h);
    if (properHighlights.length === 0) {
        return '(No highlights)';
    }
    return properHighlights.join('\n');
}

// Generate summary section for the Highlight note
export function generateNoteSummarySectionMarkdown(omnivoreItemsState, appSettings) {
    return `**Author:** ${omnivoreItemsState.author}\n` +
           `**Description:** ${omnivoreItemsState.description}\n` +
           `**Page Type:** ${omnivoreItemsState.pageType}\n` +
           `**Updated At:** ${omnivoreItemsState.updatedAt}\n` +
           `**Saved At:** ${omnivoreItemsState.savedAt}\n` +
           `**Reading Progress Percent:** ${omnivoreItemsState.readingProgressPercent} / 100\n`;
}
