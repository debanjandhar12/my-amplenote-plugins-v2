import { debounce } from "lodash-es";

/**
 * Util class that returns:
 * isArchived, isTaskListNote, isSharedByMe, isSharedWithMe, isPublished
 */
let searchResultCache = null;

const debouncedClearSearchResultCache = debounce(() => {
    searchResultCache = null;
    console.log("🔄 Cleared search result cache due to inactivity.");
}, 3 * 60 * 1000); // 3 minutes

export async function getExtendedNoteHandleProperties(app, note) {
    if (!searchResultCache) {
        searchResultCache = {};

        const isArchivedSearch = await app.filterNotes({ group: "archived" });
        if (isArchivedSearch) {
            searchResultCache.isArchivedNoteUUIDs = new Set(isArchivedSearch.map(n => n.uuid));
        }

        await delay(1000);

        const isTaskListNoteSearch = await app.filterNotes({ group: "taskList" });
        if (isTaskListNoteSearch) {
            searchResultCache.isTaskListNoteUUIDs = new Set(isTaskListNoteSearch.map(n => n.uuid));
        }

        await delay(1000);

        const isSharedByMeSearch = await app.filterNotes({ group: "shared" });
        if (isSharedByMeSearch) {
            searchResultCache.isSharedByMeNoteUUIDs = new Set(isSharedByMeSearch.map(n => n.uuid));
        }

        await delay(1000);

        const isSharedWithMeSearch = await app.filterNotes({ group: "shareReceived" });
        if (isSharedWithMeSearch) {
            searchResultCache.isSharedWithMeNoteUUIDs = new Set(isSharedWithMeSearch.map(n => n.uuid));
        }
    }

    // Reset debounce timer to clear cache after inactivity
    debouncedClearSearchResultCache();

    return {
        isArchived: searchResultCache.isArchivedNoteUUIDs?.has(note.uuid) ?? false,
        isTaskListNote: searchResultCache.isTaskListNoteUUIDs?.has(note.uuid) ?? false,
        isSharedByMe: searchResultCache.isSharedByMeNoteUUIDs?.has(note.uuid) ?? false,
        isSharedWithMe: searchResultCache.isSharedWithMeNoteUUIDs?.has(note.uuid) ?? false,
        isPublished: note.published || false,
    };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
