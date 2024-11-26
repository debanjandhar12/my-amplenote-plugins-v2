import {removeYAMLFrontmatterFromMarkdown} from "../../pinecone/removeYAMLFrontmatterFromMarkdown.js";

export const processPineconeSearchResults = async (results) => {
    const filteredResults = results
        .filter(result => result.score >= 0.75)
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
            content: await removeYAMLFrontmatterFromMarkdown(result.metadata.pageContent),
            noteUUID: result.metadata.noteUUID,
            tags: result.metadata.noteTags ? result.metadata.noteTags.split(',') : [],
        }))
    );
}