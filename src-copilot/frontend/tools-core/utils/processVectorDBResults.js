import {stripYAMLAndMarkdownFormatting} from "../../../markdown/stripYAMLAndMarkdownFormatting.js";

export const processVectorDBResults = async (results, thresholdScore = 0.35) => {
    const filteredResults = results
        .filter(result => result.score >= thresholdScore)
        //Keep only the highest-scored result for each unique noteUUID.
        .reduce((acc, result) => {
            const uuid = result.metadata.noteUUID;
            if (!acc[uuid] || acc[uuid].score < result.score) {
                acc[uuid] = result;
            }
            return acc;
        }, {});

    const uniqueResults = Object.values(filteredResults)
        .sort((a, b) => b.score - a.score);

    return Promise.all(
        uniqueResults.map(async (result) => ({
            noteTitle: result.metadata.noteTitle,
            content: await stripYAMLAndMarkdownFormatting(result.metadata.pageContent),
            noteUUID: result.metadata.noteUUID,
            tags: result.metadata.noteTags ? result.metadata.noteTags.split(',') : [],
        }))
    );
}