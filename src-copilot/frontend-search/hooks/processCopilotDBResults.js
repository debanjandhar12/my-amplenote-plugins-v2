import {stripYAMLFromMarkdown} from "../../markdown/stripYAMLFromMarkdown.js";

export const processCopilotDBResults = async (results) => {
    const filteredResults = results
        //Keep only the highest-scored result for each unique noteUUID.
        .reduce((acc, result) => {
            const uuid = result.noteUUID;
            if (!acc[uuid] || acc[uuid].similarity < result.similarity) {
                acc[uuid] = result;
            }
            return acc;
        }, {});

    const uniqueResults = Object.values(filteredResults)
        .sort((a, b) => b.similarity - a.similarity);

    return Promise.all(
        uniqueResults.map(async (result) => ({
            noteTitle: result.noteTitle,
            actualNoteContentPart: await stripYAMLFromMarkdown(result.actualNoteContentPart),
            noteUUID: result.noteUUID,
            tags: result.noteTags ? result.noteTags : [],
            headingAnchor: result.headingAnchor
        }))
    );
}
