// [ { "id": "afc93adc-307b-11ef-8238-ebef1f017e95", "title": "Getting Started with Omnivore", "siteName": "Omnivore Blog", "originalArticleUrl": "https://blog.omnivore.app/p/getting-started-with-omnivore", "author": "The Omnivore Team", "description": "Get the most out of Omnivore by learning how to use it.", "slug": "getting-started-with-omnivore", "labels": [], "highlights": [], "updatedAt": "2024-06-22T09:42:05.000Z", "savedAt": "2024-06-22T09:42:05.000Z", "pageType": "ARTICLE", "content": null, "publishedAt": "2021-10-13T00:00:00.000Z", "url": "https://blog.omnivore.app/p/getting-started-with-omnivore", "image": "https://proxy-prod.omnivore-image-cache.app/320x320,sxQnqya1QNApB7ZAGPj9K20AU6sw0UAnjmAIy2ub8hUU/https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F658efff4-341a-4720-8cf6-9b2bdbedfaa7_800x668.gif", "readAt": "2024-06-22T09:42:05.000Z", "wordsCount": 1155, "readingProgressPercent": 2, "isArchived": false, "archivedAt": null, "contentReader": "WEB" }, { "id": "afb5dfa0-307b-11ef-8238-0fcb40206f73", "title": "Organize your Omnivore library with labels", "siteName": "Omnivore Blog", "originalArticleUrl": "https://blog.omnivore.app/p/organize-your-omnivore-library-with", "author": "The Omnivore Team", "description": "Use labels to organize your Omnivore library.", "slug": "organize-your-omnivore-library-with-labels", "labels": [], "highlights": [ { "id": "bf79e2b0-7d95-4659-8d12-6b6632986571", "quote": "Omnivore provides labels (also known as tags)", "annotation": "Nice labels comment", "patch": "@@ -126,32 +126,52 @@\n l%0A    %0A         \n+%3Comnivore_highlight%3E\n Omnivore provide\n@@ -199,16 +199,37 @@\n as tags)\n+%3C/omnivore_highlight%3E\n  to help\n", "updatedAt": "2024-06-22T09:52:53.000Z", "labels": [], "type": "HIGHLIGHT", "highlightPositionPercent": 0.073860355, "color": "yellow", "highlightPositionAnchorIndex": 3, "prefix": " ", "suffix": " to help you organize your library. Labels can be added to any saved read, and your library can be filtered based on labels. \n        ", "createdAt": "2024-06-22T09:51:51.000Z" }, { "id": "a8a53342-a0d1-400f-9d04-f6876ececa96", "quote": "iOS users can long press on an item", "annotation": null, "patch": "@@ -941,16 +941,36 @@\n         \n+%3Comnivore_highlight%3E\n iOS user\n@@ -996,16 +996,37 @@\n  an item\n+%3C/omnivore_highlight%3E\n  in the \n", "updatedAt": "2024-06-22T09:51:58.000Z", "labels": [], "type": "HIGHLIGHT", "highlightPositionPercent": 39.48644, "color": "red", "highlightPositionAnchorIndex": 20, "prefix": " ", "suffix": " in the library or access the labels modal from the menu in the top right of the reader page. \n        ", "createdAt": "2024-06-22T09:51:58.000Z" }, { "id": "68c020a9-f776-4061-a138-a62bdd1404e1", "quote": null, "annotation": "Hi", "patch": null, "updatedAt": "2024-06-22T09:52:24.000Z", "labels": [], "type": "NOTE", "highlightPositionPercent": 0, "color": null, "highlightPositionAnchorIndex": 0, "prefix": null, "suffix": null, "createdAt": "2024-06-22T09:52:22.000Z" } ], "updatedAt": "2024-06-22T09:53:03.000Z", "savedAt": "2024-06-22T09:42:05.000Z", "pageType": "ARTICLE", "content": null, "publishedAt": "2022-04-18T00:00:00.000Z", "url": "https://blog.omnivore.app/p/organize-your-omnivore-library-with", "image": "https://proxy-prod.omnivore-image-cache.app/320x320,sTgJ5Q0XIg_EHdmPWcxtXFmkjn8T6hkJt7S9ziClagYo/https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fdaf07af7-5cdb-4ecc-aace-1a46de3e9c58_1827x1090.png", "readAt": "2024-06-22T09:53:03.000Z", "wordsCount": 259, "readingProgressPercent": 53, "isArchived": false, "archivedAt": null, "contentReader": "WEB" } ]
import {OMNIVORE_APP_URL, OMNIVORE_DASHBOARD_COLUMNS_SETTING} from "../constants.js";

export async function generateDashboardTable(toCreateUpdateNotes, appSettings, getNoteUrlFromTitle) {
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
    const rows = await Promise.all(toCreateUpdateNotes.map(async note => {
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
export function generateNoteHighlightSectionMarkdown(toCreateUpdateNote, appSettings) {
    const highlights = toCreateUpdateNote.highlights || [];
    const properHighlights = highlights.map(highlight => {
       if (!highlight.quote) return null;
       return `**Highlight [↗️](${OMNIVORE_APP_URL}/me/${toCreateUpdateNote.slug}#${highlight.id}):**\n`+
              `> ${highlight.quote.split('\n').join(' ')}\n`;
    }).filter(h => h);
    if (properHighlights.length === 0) {
        return '(No highlights)';
    }
    return properHighlights.join('\n');
}

// Generate summary section for the Highlight note
export function generateNoteSummarySectionMarkdown(toCreateUpdateNote, appSettings) {
    return `**Author:** ${toCreateUpdateNote.author}\n` +
           `**Description:** ${toCreateUpdateNote.description}\n` +
           `**Page Type:** ${toCreateUpdateNote.pageType}\n` +
           `**Updated At:** ${toCreateUpdateNote.updatedAt}\n` +
           `**Saved At:** ${toCreateUpdateNote.savedAt}\n` +
           `**Reading Progress Percent:** ${toCreateUpdateNote.readingProgressPercent} / 100\n`;
}


// const section = { heading: { text: "Highlights" }};
// await app.replaceNoteContent({ uuid: noteUUID }, content, { section });
