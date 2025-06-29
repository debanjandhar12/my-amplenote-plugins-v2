import {debounce} from "lodash-es";

/**
 * Util class that returns:
 * isArchived, isTaskListNote, isSharedByMe, isSharedWithMe, isPublished
 */
let searchResultCache = null, debouncedClearSearchResultCache = null;
export async function getExtendedNoteHandleProperties(app, note) {
    if (!searchResultCache) {
        searchResultCache = {};
        const isArchivedSearch = await app.filterNotes({group: "archived"});
        if (isArchivedSearch) {
            searchResultCache.isArchivedNoteUUIDs = new Set(isArchivedSearch.map(note => note.uuid));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isTaskListNoteSearch = await app.filterNotes({group: "taskList"});
        if (isTaskListNoteSearch) {
            searchResultCache.isTaskListNoteUUIDs = new Set(isTaskListNoteSearch.map(note => note.uuid));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isSharedByMeSearch = await app.filterNotes({group: "shared"});
        if (isSharedByMeSearch) {
            searchResultCache.isSharedByMeNoteUUIDs = new Set(isSharedByMeSearch.map(note => note.uuid));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isSharedWithMeSearch = await app.filterNotes({group: "shareReceived"});
        if (isSharedWithMeSearch) {
            searchResultCache.isSharedWithMeNoteUUIDs = new Set(isSharedWithMeSearch.map(note => note.uuid));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        debouncedClearSearchResultCache = debounce(() => {
            searchResultCache = null;
        }, 3 * 60000); // 3 minutes
    }
    return {
        isArchived: searchResultCache.isArchivedNoteUUIDs.has(note.uuid),
        isTaskListNote: searchResultCache.isTaskListNoteUUIDs.has(note.uuid),
        isSharedByMe: searchResultCache.isSharedByMeNoteUUIDs.has(note.uuid),
        isSharedWithMe: searchResultCache.isSharedWithMeNoteUUIDs.has(note.uuid),
        isPublished: note.published || false
    };
}