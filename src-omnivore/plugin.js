import {
    BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING,
    BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT,
    OMINOVRE_API_ENDPOINT,
    OMNIVORE_API_KEY_SETTING,
    OMNIVORE_DASHBOARD_COLUMNS_SETTING, OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT,
    OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT,
    OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING,
    OMNIVORE_PLUGIN_VERSION,
    OMNIVORE_SYNC_BATCH_SIZE, SYNC_ARTICLE_CONTENT_SETTING, SYNC_ARTICLE_CONTENT_SETTING_DEFAULT
} from "./constants.js";
import { getDeletedOmnivoreItems, getOmnivoreItems} from "./omnivore/api.js";
import {
    generateDashboardTable,
    generateNoteHighlightSectionMarkdown,
    generateNoteSummarySectionMarkdown
} from "./amplenote/generate-markdown.js";
import {SAMPLE_OMNIVORE_STATE_DATA} from "./test/test-data.js";
import {cloneDeep} from "lodash-es";

const plugin = {
    appOption: {
        "Sync all": async function (app) {
            await plugin._syncAll(app);
        },
    },
    noteOption: {
        "Sync all": {
            run: async function(app, noteUUID) {
                await plugin._syncAll(app);
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
            if (await plugin._checkOmnivoreApiKey(app)) {
                const {
                    omnivoreItemsState,
                    omnivoreItemsStateDelta,
                    omnivoreDeletedItems
                } = await plugin._syncStateWithOmnivore(app);
                console.log(omnivoreItemsState, omnivoreItemsStateDelta, omnivoreDeletedItems);
                const suppressedErrorMessages = await plugin._syncHighlightsToNotes(omnivoreItemsState, omnivoreItemsStateDelta, omnivoreDeletedItems, app);
                await plugin._syncCatalogToDashboard(omnivoreItemsState, app);
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
            await app.setSetting("lastSyncTime", "");
            await app.setSetting("lastOmnivoreItemsState", JSON.stringify([]));
        }
        const lastSyncTime = app.settings["lastSyncTime"];
        let lastOmnivoreItemsState = [];
        try {
            lastOmnivoreItemsState = JSON.parse(app.settings["lastOmnivoreItemsState"])
        } catch (e) {
            console.error("Failed to parse lastOmnivoreItemsState", e);
        }


        // Fetch all omnivore items which are non-archived
        let omnivoreItemsState = cloneDeep(lastOmnivoreItemsState);
        const omnivoreItemsStateDelta = [];
        for (let after = 0; ; after += OMNIVORE_SYNC_BATCH_SIZE) {
            const [items, hasNextPage] = await getOmnivoreItems(
                app.settings[OMNIVORE_API_KEY_SETTING],
                after,
                OMNIVORE_SYNC_BATCH_SIZE,
                lastSyncTime,
                "",
                (app.settings[SYNC_ARTICLE_CONTENT_SETTING] || SYNC_ARTICLE_CONTENT_SETTING_DEFAULT).includes("true"),
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
        if (lastSyncTime !== "" && lastSyncTime != null) {  // TODO: This if statement may need to be removed as it causes notes from last sync to not be deleted
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

        await app.setSetting("lastSyncPluginVersion", OMNIVORE_PLUGIN_VERSION);
        await app.setSetting("lastSyncTime", new Date().toISOString());
        await app.setSetting("lastOmnivoreItemsState", JSON.stringify(omnivoreItemsState));

        return {omnivoreItemsState, omnivoreItemsStateDelta, omnivoreDeletedItems};
    },
    _checkOmnivoreApiKey: async function (app) {
        try {
            const [items, hasNextPage] = await getOmnivoreItems(
                app.settings[OMNIVORE_API_KEY_SETTING],
                0,
                1,
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
        dashboardNote = await app.notes.find(dashboardNote.uuid);
        app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] = app.settings[OMNIVORE_DASHBOARD_COLUMNS_SETTING] || OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT;
        const newDashboardContent = await generateDashboardTable(omnivoreItemsState, app.settings, async (title) => {
            const note = await app.findNote({ name: title });
            if (!note) {
                return '';
            }
            return await app.getNoteURL({ uuid: note.uuid });
        });
        const currentDashboardContent = await dashboardNote.content();
        if (currentDashboardContent.trim() !== newDashboardContent.trim()) {   // This always false :(, need to fix
            await app.replaceNoteContent({uuid: dashboardNote.uuid}, newDashboardContent);
        }
    },
    _syncHighlightsToNotes: async function (omnivoreItemsState, omnivoreItemsStateDelta, omnivoreDeletedItems, app) {
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

        // - Step 2: Filter out which notes to create or update -
        let omnivoreItemsStateFiltered = [];
        for (let omnivoreItem of omnivoreItemsState) {
            if (omnivoreItem.title && omnivoreItem.title !== ""
                && !(await app.findNote({ name: omnivoreItem.title }))) {
                omnivoreItemsStateFiltered.push(omnivoreItem);  // Push items which don't exist in Amplenote
            }
        }
        omnivoreItemsStateFiltered = [...omnivoreItemsStateFiltered, ...omnivoreItemsStateDelta];

        // - Step 3: Create or update highlight notes -
        for (let omnivoreItem of omnivoreItemsStateFiltered) {
            try {
                let highlightNote = await app.findNote({ name: omnivoreItem.title });
                if (!highlightNote) {
                    highlightNote = await app.notes.create(omnivoreItem.title, []);
                    if (!highlightNote || !highlightNote.uuid) {
                        suppressedErrorMessages.push(`Failed to create highlight note: ${omnivoreItem.title}`);
                        console.log(`Failed to create highlight note: ${omnivoreItem.title}`);
                    }
                }
                // Required to get note interface instead of simple note object
                highlightNote = await app.notes.find(highlightNote.uuid);

                // Handle tags
                app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING] = app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING] || BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT;
                if (BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT !== app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING] &&
                    (highlightNote.tags.includes(BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT) || !highlightNote.tags.includes(app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING]))) {
                    await highlightNote.removeTag(BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT);
                    await highlightNote.addTag(app.settings[BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING]);
                }

                const summaryContent = generateNoteSummarySectionMarkdown(omnivoreItem, app.settings);
                const highlightsContent = generateNoteHighlightSectionMarkdown(omnivoreItem, app.settings);
                const newNoteContent = `# Summary\n${summaryContent}<br/>\n# Highlights\n${highlightsContent}`
                    + ((app.settings[SYNC_ARTICLE_CONTENT_SETTING] || SYNC_ARTICLE_CONTENT_SETTING_DEFAULT).includes("true") && omnivoreItem.content
                    && omnivoreItem.content !== "" ? `\n\n# Content\n${omnivoreItem.content.length > 60000 ? omnivoreItem.content.substring(0, 60000) + "..." : omnivoreItem.content}` : "");
                const currentNoteContent = await highlightNote.content();
                if (currentNoteContent.trim() !== newNoteContent.trim()) {   // This always false :(, need to fix
                    await app.replaceNoteContent({ uuid: highlightNote.uuid }, newNoteContent);
                }
            } catch (e) {
                suppressedErrorMessages.push(`Failed to sync highlight note: ${omnivoreItem.title}. Error:` + typeof e === "string" ? e : e.message);
                console.error(`Failed to sync highlight note: ${omnivoreItem.title}`, e);
            }
        }

        return suppressedErrorMessages;
    }
}

export default plugin;
