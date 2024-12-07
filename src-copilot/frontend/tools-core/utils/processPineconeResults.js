import {stripYAMLAndMarkdownFormatting} from "../../../markdown/stripYAMLAndMarkdownFormatting.js";

export const processPineconeSearchResults = async (results, thresholdScore = 0.75) => {
    const filteredResults = results
        .filter(result => result.score >= thresholdScore)
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