/**
 * Util class that returns:
 * isArchived, isTaskListNote, isSharedByMe,isSharedWithMe, isPublished
 */
let searchResultCache = null;
export async function getExtendedNoteHandleProperties(app, note) {
    if (!searchResultCache) {
        searchResultCache = {};
        const isArchivedSearch = await app.filterNotes({group: "archived"});
        if (isArchivedSearch) {
            searchResultCache.isArchivedNoteUUIDs = new Set(isArchivedSearch.map(note => note.uuid));
        }
        const isTaskListNoteSearch = await app.filterNotes({group: "taskList"});
        if (isTaskListNoteSearch) {
            searchResultCache.isTaskListNoteUUIDs = new Set(isTaskListNoteSearch.map(note => note.uuid));
        }
        const isSharedByMeSearch = await app.filterNotes({group: "shared"});
        if (isSharedByMeSearch) {
            searchResultCache.isSharedByMeNoteUUIDs = new Set(isSharedByMeSearch.map(note => note.uuid));
        }
        const isSharedWithMeSearch = await app.filterNotes({group: "shareReceived"});
        if (isSharedWithMeSearch) {
            searchResultCache.isSharedWithMeNoteUUIDs = new Set(isSharedWithMeSearch.map(note => note.uuid));
        }
        setTimeout(() => {
            searchResultCache = null;
        }, 1000 * 60); // Cache expires after 1 minute
    }
    return {
        isArchived: searchResultCache.isArchivedNoteUUIDs.has(note.uuid),
        isTaskListNote: searchResultCache.isTaskListNoteUUIDs.has(note.uuid),
        isSharedByMe: searchResultCache.isSharedByMeNoteUUIDs.has(note.uuid),
        isSharedWithMe: searchResultCache.isSharedWithMeNoteUUIDs.has(note.uuid),
        isPublished: note.published || false
    };
}