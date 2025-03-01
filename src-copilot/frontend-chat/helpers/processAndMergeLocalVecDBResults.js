import {stripYAMLFromMarkdown} from "../../markdown/stripYAMLFromMarkdown.js";

export const processAndMergeLocalVecDBResults = async (results, thresholdScore = 0.40) => {
    const filteredResults = results
        .filter(result => result.score >= thresholdScore)
        .sort((a, b) => a.id.localeCompare(b.id));

    // merge results with the same note
    const mergedResults = [];
    let currentResult = filteredResults[0];
    for (let i = 1; i < filteredResults.length; i++) {
        const nextResult = filteredResults[i];
        if (currentResult.metadata.noteUUID === nextResult.metadata.noteUUID) {
            currentResult.score = Math.max(currentResult.score, nextResult.score);
            currentResult.metadata.noteContentPart = await stripYAMLFromMarkdown(currentResult.metadata.noteContentPart);
            // check if nextResult has the next part of the same note
            try {
                if (nextResult.id !== currentResult.id.split('##')[0] + '##' + (parseInt(currentResult.id.split('##')[1]) + 1)) {
                    currentResult.metadata.noteContentPart += '\n' + '<<Redacted>>';
                }
            } catch (e) { }
            currentResult.metadata.noteContentPart += '\n' + await stripYAMLFromMarkdown(nextResult.metadata.noteContentPart);
        } else {
            mergedResults.push(currentResult);
            currentResult = nextResult;
        }
    }
    mergedResults.push(currentResult);

    return mergedResults.map(result => ({
        noteTitle: result.metadata.noteTitle,
        noteUUID: result.metadata.noteUUID,
        noteContentPart: result.metadata.noteContentPart,
        tags: result.metadata.noteTags ? result.metadata.noteTags : [],
    }));
}