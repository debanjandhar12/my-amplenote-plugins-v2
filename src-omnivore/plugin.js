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
import {SAMPLE_OMNIVORE_STATE_DATA} from "./test/test-data.js";

const plugin = {
    appOption: {
        "Sync all": async function (app) {
            await this._syncAll(app);
        },
    },
    noteOption: {
        "Sync all": {
            run: async function(app, noteUUID) {
                await this._syncAll(app);
            },
            check: async function(app, noteUUID) {
                const noteObject = await app.findNote({uuid: noteUUID});
                const noteTitle = noteObject.name;
                return noteTitle === app.settings[OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING] || noteTitle === OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT;
            },
        }
    },
    _syncAll: async function (app) {
        if (app.settings[OMNIVORE_API_KEY_SETTING] === ""
            || app.settings[OMNIVORE_API_KEY_SETTING] === undefined ||
            app.settings[OMNIVORE_API_KEY_SETTING] === null) {
            app.alert("Please set your Omnivore API Key in the settings.");
            return;
        }
        try {
            if (await this._checkOmnivoreApiKey(app)) {
                const {
                    omnivoreItemsState,
                    omnivoreItemsStateDelta,
                    omnivoreDeletedItems
                } = await this._syncStateWithOmnivore(app);
                const suppressedErrorMessages = await this._syncHighlightsToNotes(omnivoreItemsStateDelta, omnivoreDeletedItems, app);
                await this._syncCatalogToDashboard(omnivoreItemsState, app);
                app.alert("Syncing complete. "
                    + `${suppressedErrorMessages.length > 0 ? "Some errors were encountered: " + suppressedErrorMessages.join("\n") : ""}`);
            }
            else {
                app.alert("Failed to connect to omnivore. It is likely Omnivore API Key provided in settings is invalid.");
            }
        } catch (e) {
            console.error(e);
            app.alert("Error encountered: " + e.message);
        }
    },
    _syncStateWithOmnivore: async function (app) {
        const lastSyncPluginVersion = app.settings["lastSyncPluginVersion"];
        if (lastSyncPluginVersion !== OMNIVORE_PLUGIN_VERSION) {
            app.setSetting("lastSyncTime", "");
            app.setSetting("lastOmnivoreItemsState", JSON.stringify([]));
        }
        const lastSyncTime = app.settings["lastSyncTime"];
        let lastOmnivoreItemsState = [];
        try {
            lastOmnivoreItemsState = JSON.parse(app.settings["lastOmnivoreItemsState"])
        } catch (e) {}


        // Fetch all omnivore items whcih are non-archived
        let omnivoreItemsState = JSON.parse(JSON.stringify(lastOmnivoreItemsState));
        const omnivoreItemsStateDelta = [];
        for (let after = 0; ; after += OMNIVORE_SYNC_BATCH_SIZE) {
            const [items, hasNextPage] = await getOmnivoreItems(
                app.settings[OMNIVORE_API_KEY_SETTING],
                after,
                OMNIVORE_SYNC_BATCH_SIZE,
                lastSyncTime,
                "",
                false,
                'highlightedMarkdown',
                OMINOVRE_API_ENDPOINT
            );
            for (const item of items) {
                const note = omnivoreItemsState.find(n => n.id === item.id);
                if (note) {
                    omnivoreItemsState[omnivoreItemsState.indexOf(note)] = item;
                } else {
                    omnivoreItemsState.push(item);
                }
                omnivoreItemsStateDelta.push(item);
            }
            if (!hasNextPage)
                break;
            if (after % (5 * OMNIVORE_SYNC_BATCH_SIZE) === 0) // wait for 1 secs every 5 queries to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Fetch all items to delete
        const omnivoreDeletedItems = [];
        if (lastSyncTime !== "" && lastSyncTime != null) {
            for (let after = 0; ; after += size) {
                const [deletedItems, hasNextPage] = await getDeletedOmnivoreItems(
                    app.settings[OMNIVORE_API_KEY_SETTING],
                    after,
                    OMNIVORE_SYNC_BATCH_SIZE,
                    lastSyncTime,
                    OMINOVRE_API_ENDPOINT
                );
                for (const item of deletedItems) {
                    omnivoreDeletedItems.push(item);
                }
                if (!hasNextPage)
                    break;
                if (after % (5 * OMNIVORE_SYNC_BATCH_SIZE) === 0) // wait for 1 secs every 5 queries to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        omnivoreItemsState = omnivoreItemsState.filter((item) => {
            return omnivoreDeletedItems.find((deletedItem) => deletedItem.id === item.id) === undefined;
        });

        app.setSetting("lastSyncPluginVersion", OMNIVORE_PLUGIN_VERSION);
        app.setSetting("lastSyncTime", new Date().toISOString());
        app.setSetting("lastOmnivoreItemsState", JSON.stringify(omnivoreItemsState));

        return {omnivoreItemsState, omnivoreItemsStateDelta, omnivoreDeletedItems};
    },
    _checkOmnivoreApiKey: async function (app) {
        try {
            const [items, hasNextPage] = await getOmnivoreItems(
                app.settings[OMNIVORE_API_KEY_SETTING],
                0,
                OMNIVORE_SYNC_BATCH_SIZE,
                new Date().toISOString(),
                "",
                false,
                'highlightedMarkdown',
                OMINOVRE_API_ENDPOINT
            );
        }
        catch (e) {
            if (e.message.includes("Unexpected server error"))
                return false;
        }
        return true;
    },
    _syncCatalogToDashboard: async function (omnivoreItemsState, app) {
        const dashboardNoteTitle = app.settings[OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING] || OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT;
        let dashboardNote = await app.findNote({ name: dashboardNoteTitle });
        if (!dashboardNote) {
            dashboardNote = await app.notes.create(dashboardNoteTitle, []);
            if (!dashboardNote || !dashboardNote.uuid) {
                throw new Error(`Failed to create dashboard note: ${dashboardNoteTitle}`);
            }
        }
        app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] = app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] || OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT;
        const newDashboardContent = await generateDashboardTable(omnivoreItemsState, app.settings, async (title) => {
            const note = await app.findNote({ name: title });
            if (!note) {
                return '';
            }
            return await app.getNoteURL({ uuid: note.uuid });
        });
        await app.replaceNoteContent({ uuid: dashboardNote.uuid }, newDashboardContent);
    },
    _syncHighlightsToNotes: async function (omnivoreItemsState, omnivoreDeletedItems, app) {
        const suppressedErrorMessages = [];

        // - Step 1: Delete archived notes -
        for (let omnivoreItem of omnivoreDeletedItems) {
            let highlightNote = await app.findNote({ name: omnivoreItem.title });
            if (highlightNote) {
                highlightNote = await app.notes.find(highlightNote.uuid);
                const content = await highlightNote.content();
                if (content.includes("Summary") || content.includes("Highlights"))
                    await app.deleteNote({ uuid: highlightNote.uuid });
                else
                    suppressedErrorMessages.push(`Failed to delete highlight note: ${omnivoreItem.title}`);
            }
        }

        // - Step 2: Create or update highlight notes -
        for (let omnivoreItem of omnivoreItemsState) {
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
