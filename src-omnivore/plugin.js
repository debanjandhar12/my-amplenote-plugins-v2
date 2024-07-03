import 'fs';
import {
    BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING,
    BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT,
    OMINOVRE_API_ENDPOINT,
    OMNIVORE_API_KEY_SETTING,
    OMNIVORE_DASHBOARD_COLUMNS_SETTING, OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT,
    OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT,
    OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING,
    OMNIVORE_PLUGIN_VERSION,
    OMNIVORE_SYNC_BATCH_SIZE
} from "./constants.js";
import {getDeletedOmnivoreItems, getOmnivoreItems} from "./omnivore/api.js";
import {
    generateDashboardTable,
    generateNoteHighlightSectionMarkdown,
    generateNoteSummarySectionMarkdown
} from "./amplenote/generate-markdown.js";

const plugin = {
    appOption: {
        "Sync all": async function (app) {
            if (app.settings[OMNIVORE_API_KEY_SETTING] === ""
                || app.settings[OMNIVORE_API_KEY_SETTING] === undefined ||
                app.settings[OMNIVORE_API_KEY_SETTING] === null) {
                app.alert("Please set your Omnivore API Key in the settings.");
                return;
            }
            try {
                // const {toCreateUpdateNotes, toCreateUpdateNotesDelta, toDeleteNotes} = await this._fetchDataForSync(app);
                const toCreateUpdateNotes = [ { "id": "afc93adc-307b-11ef-8238-ebef1f017e95", "title": "Getting Started with Omnivore", "siteName": "Omnivore Blog", "originalArticleUrl": "https://blog.omnivore.app/p/getting-started-with-omnivore", "author": "The Omnivore Team", "description": "Get the most out of Omnivore by learning how to use it.", "slug": "getting-started-with-omnivore", "labels": [], "highlights": [], "updatedAt": "2024-06-22T09:42:05.000Z", "savedAt": "2024-06-22T09:42:05.000Z", "pageType": "ARTICLE", "content": null, "publishedAt": "2021-10-13T00:00:00.000Z", "url": "https://blog.omnivore.app/p/getting-started-with-omnivore", "image": "https://proxy-prod.omnivore-image-cache.app/320x320,sxQnqya1QNApB7ZAGPj9K20AU6sw0UAnjmAIy2ub8hUU/https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F658efff4-341a-4720-8cf6-9b2bdbedfaa7_800x668.gif", "readAt": "2024-06-22T09:42:05.000Z", "wordsCount": 1155, "readingProgressPercent": 2, "isArchived": false, "archivedAt": null, "contentReader": "WEB" }, { "id": "afb5dfa0-307b-11ef-8238-0fcb40206f73", "title": "Organize your Omnivore library with labels", "siteName": "Omnivore Blog", "originalArticleUrl": "https://blog.omnivore.app/p/organize-your-omnivore-library-with", "author": "The Omnivore Team", "description": "Use labels to organize your Omnivore library.", "slug": "organize-your-omnivore-library-with-labels", "labels": [], "highlights": [ { "id": "bf79e2b0-7d95-4659-8d12-6b6632986571", "quote": "Omnivore provides labels (also known as tags)", "annotation": "Nice labels comment", "patch": "@@ -126,32 +126,52 @@\n l%0A    %0A         \n+%3Comnivore_highlight%3E\n Omnivore provide\n@@ -199,16 +199,37 @@\n as tags)\n+%3C/omnivore_highlight%3E\n  to help\n", "updatedAt": "2024-06-22T09:52:53.000Z", "labels": [], "type": "HIGHLIGHT", "highlightPositionPercent": 0.073860355, "color": "yellow", "highlightPositionAnchorIndex": 3, "prefix": " ", "suffix": " to help you organize your library. Labels can be added to any saved read, and your library can be filtered based on labels. \n        ", "createdAt": "2024-06-22T09:51:51.000Z" }, { "id": "a8a53342-a0d1-400f-9d04-f6876ececa96", "quote": "iOS users can long press on an item", "annotation": null, "patch": "@@ -941,16 +941,36 @@\n         \n+%3Comnivore_highlight%3E\n iOS user\n@@ -996,16 +996,37 @@\n  an item\n+%3C/omnivore_highlight%3E\n  in the \n", "updatedAt": "2024-06-22T09:51:58.000Z", "labels": [], "type": "HIGHLIGHT", "highlightPositionPercent": 39.48644, "color": "red", "highlightPositionAnchorIndex": 20, "prefix": " ", "suffix": " in the library or access the labels modal from the menu in the top right of the reader page. \n        ", "createdAt": "2024-06-22T09:51:58.000Z" }, { "id": "68c020a9-f776-4061-a138-a62bdd1404e1", "quote": null, "annotation": "Hi", "patch": null, "updatedAt": "2024-06-22T09:52:24.000Z", "labels": [], "type": "NOTE", "highlightPositionPercent": 0, "color": null, "highlightPositionAnchorIndex": 0, "prefix": null, "suffix": null, "createdAt": "2024-06-22T09:52:22.000Z" } ], "updatedAt": "2024-06-22T09:53:03.000Z", "savedAt": "2024-06-22T09:42:05.000Z", "pageType": "ARTICLE", "content": null, "publishedAt": "2022-04-18T00:00:00.000Z", "url": "https://blog.omnivore.app/p/organize-your-omnivore-library-with", "image": "https://proxy-prod.omnivore-image-cache.app/320x320,sTgJ5Q0XIg_EHdmPWcxtXFmkjn8T6hkJt7S9ziClagYo/https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fdaf07af7-5cdb-4ecc-aace-1a46de3e9c58_1827x1090.png", "readAt": "2024-06-22T09:53:03.000Z", "wordsCount": 259, "readingProgressPercent": 53, "isArchived": false, "archivedAt": null, "contentReader": "WEB" } ];
                await this._syncHighlightsToNotes(toCreateUpdateNotes, [], app);
                await this._syncCatalogToDashboard(toCreateUpdateNotes, app);
                app.alert("Syncing complete.");
            } catch (e) {
                console.error(e);
                app.alert("Error encountered: " + e.message);
            }
        },
    },
    _fetchDataForSync: async function (app) {
        const lastToCreateUpdateNotesVersion = app.settings["lastToCreateUpdateNotesVersion"];
        if (lastToCreateUpdateNotesVersion !== OMNIVORE_PLUGIN_VERSION) {
            app.setSetting("lastToCreateUpdateNotesUpdateTime", "");
            app.setSetting("lastToCreateUpdateNotes", []);
        }
        const lastToCreateUpdateNotesUpdateTime = app.settings["lastToCreateUpdateNotesUpdateTime"];
        let lastToCreateUpdateNotes = [];
        try {
            lastToCreateUpdateNotes = JSON.parse(app.settings["lastToCreateUpdateNotes"])
        } catch (e) {}
        const lastToCreateUpdateNotesDelta = [];

        // Fetch and cache all notes to create/update
        for (let after = 0; ; after += OMNIVORE_SYNC_BATCH_SIZE) {
            const [items, hasNextPage] = await getOmnivoreItems(
                app.settings[OMNIVORE_API_KEY_SETTING],
                after,
                OMNIVORE_SYNC_BATCH_SIZE,
                lastToCreateUpdateNotesUpdateTime,
                "",
                false,
                'highlightedMarkdown',
                OMINOVRE_API_ENDPOINT
            );
            for (const item of items) {
                const note = lastToCreateUpdateNotes.find(n => n.id === item.id);
                if (note) {
                    lastToCreateUpdateNotes[lastToCreateUpdateNotes.indexOf(note)] = item;
                } else {
                    lastToCreateUpdateNotes.push(item);
                }
                lastToCreateUpdateNotesDelta.push(item);
            }
            if (!hasNextPage) {
                break
            }
        }

        // Fetch all notes to delete
        const toDeleteNotes = [];
        if (lastToCreateUpdateNotesUpdateTime !== "" && lastToCreateUpdateNotesUpdateTime != null) {
            for (let after = 0; ; after += size) {
                const [deletedItems, hasNextPage] = await getDeletedOmnivoreItems(
                    app.settings[OMNIVORE_API_KEY_SETTING],
                    after,
                    OMNIVORE_SYNC_BATCH_SIZE,
                    lastToCreateUpdateNotesUpdateTime,
                    OMINOVRE_API_ENDPOINT
                );
                for (const item of deletedItems) {
                    toDeleteNotes.push(item);
                }
                if (!hasNextPage) {
                    break
                }
            }
        }
        lastToCreateUpdateNotes = lastToCreateUpdateNotes.filter((item) => {
            return toDeleteNotes.find((deletedItem) => deletedItem.id === item.id) === undefined;
        });

        app.setSetting("lastToCreateUpdateNotesVersion", OMNIVORE_PLUGIN_VERSION);
        app.setSetting("lastToCreateUpdateNotesUpdateTime", new Date().toISOString());
        app.setSetting("lastToCreateUpdateNotes", JSON.stringify(lastToCreateUpdateNotes));

        return {toCreateUpdateNotes: lastToCreateUpdateNotes,
            toCreateUpdateNotesDelta: lastToCreateUpdateNotesDelta,
            toDeleteNotes};
    },
    _syncCatalogToDashboard: async function (toCreateUpdateNotes, app) {
        const dashboardNoteTitle = app.settings[OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING] || OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT;
        let dashboardNote = await app.findNote({ name: dashboardNoteTitle });
        if (!dashboardNote) {
            dashboardNote = await app.notes.create(dashboardNoteTitle, []);
            if (!dashboardNote || !dashboardNote.uuid) {
                throw new Error(`Failed to create dashboard note: ${dashboardNoteTitle}`);
            }
        }
        app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] = app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] || OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT;
        const newDashboardContent = await generateDashboardTable(toCreateUpdateNotes, app.settings, async (title) => {
            const note = await app.findNote({ name: title });
            if (!note) {
                return '';
            }
            return await app.getNoteURL({ uuid: note.uuid });
        });
        await app.replaceNoteContent({ uuid: dashboardNote.uuid }, newDashboardContent);
    },
    _syncHighlightsToNotes: async function (toCreateUpdateNotes, toDeleteNotes, app) {
        const suppressedErrorMessages = [];

        // - Step 1: Delete archived notes -
        for (let omnivoreItem of toDeleteNotes) {
            const highlightNote = await app.findNote({ name: omnivoreItem.title });
            if (highlightNote) {
                await app.deleteNote({ uuid: highlightNote.uuid });
            }
        }

        // - Step 2: Create or update highlight notes -
        for (let omnivoreItem of toCreateUpdateNotes) {
            let highlightNote = await app.findNote({ name: omnivoreItem.title });
            if (!highlightNote) {
                highlightNote = await app.notes.create(omnivoreItem.title, []);
                if (!highlightNote || !highlightNote.uuid) {
                    suppressedErrorMessages.push(`Failed to create highlight note: ${omnivoreItem.title}`);
                    console.log(`Failed to create highlight note: ${omnivoreItem.title}`);
                }
            }
            else {
                // Required to get note interface instead of simple note object
                highlightNote = await app.notes.find(highlightNote.uuid);
            }

            // Handle tags
            app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING] = app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING] || BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT;
            await highlightNote.removeTag(BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT);
            await highlightNote.addTag(app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING]);

            // // Create Sections if not exist
            // const sections = await highlightNote.sections();
            // const sectionNames = sections.flatMap(obj => {
            //     if (obj.heading && obj.heading.text) {
            //         return [obj.heading];
            //     } else {
            //         return []; // handle case where obj.heading does not exist
            //     }
            // });
            //
            // if (!sectionNames.find(s => s.text === "Summary") || !sectionNames.find(s => s.text === "Highlights")) {
            //     await app.replaceNoteContent({ uuid: highlightNote.uuid }, "# Summary\n\n# Highlights\n\n");
            // }
            //
            // // Generate content and replace
            // const summarySection = { heading: { text: "Summary" }};
            // const highlightsSection = { heading: { text: "Highlights" }};
            // const summaryContent = generateNoteSummarySectionMarkdown(omnivoreItem, app.settings);
            // const highlightsContent = generateNoteHighlightSectionMarkdown(omnivoreItem, app.settings);
            // await app.replaceNoteContent({ uuid: highlightNote.uuid }, summaryContent, summarySection);
            // await app.replaceNoteContent({ uuid: highlightNote.uuid }, highlightsContent, { highlightsSection });

            const summaryContent = generateNoteSummarySectionMarkdown(omnivoreItem, app.settings);
            const highlightsContent = generateNoteHighlightSectionMarkdown(omnivoreItem, app.settings);
            const content = `# Summary:\n${summaryContent}\n\n\n# Highlights\n${highlightsContent}`;
            await app.replaceNoteContent({ uuid: highlightNote.uuid }, content);
        }

        return suppressedErrorMessages;
    }
}

export default plugin;
