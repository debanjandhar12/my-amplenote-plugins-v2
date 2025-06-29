import {stripYAMLFromMarkdown} from "../../markdown/stripYAMLFromMarkdown.js";

export const processAndMergeLocalVecDBResults = async (results, thresholdScore = 0.15) => {
    const filteredResults = results
        .filter(result => result.similarity >= thresholdScore)
        .sort((a, b) => a.id.localeCompare(b.id));

    // merge results with the same note
    const mergedResults = [];
    let currentResult = filteredResults[0];
    for (let i = 1; i < filteredResults.length; i++) {
        const nextResult = filteredResults[i];
        if (currentResult.noteUUID === nextResult.noteUUID) {
            currentResult.similarity = Math.max(currentResult.similarity, nextResult.similarity);
            currentResult.actualNoteContentPart = await stripYAMLFromMarkdown(currentResult.actualNoteContentPart);
            // check if nextResult has the next part of the same note
            try {
                if (nextResult.id !== currentResult.id.split('##')[0] + '##' + (parseInt(currentResult.id.split('##')[1]) + 1)) {
                    currentResult.actualNoteContentPart += '\n' + '<<Redacted>>';
                }
            } catch (e) { }
            currentResult.actualNoteContentPart += '\n' + await stripYAMLFromMarkdown(nextResult.actualNoteContentPart);
        } else {
            mergedResults.push(currentResult);
            currentResult = nextResult;
        }
    }
    mergedResults.push(currentResult);

    return mergedResults.map(result => ({
        noteTitle: result.noteTitle,
        noteUUID: result.noteUUID,
        actualNoteContentPart: result.actualNoteContentPart,
        tags: result.noteTags ? result.noteTags : [],
    }));
}