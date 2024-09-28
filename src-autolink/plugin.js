import {
    AUTOLINK_RELATED_NOTES_SECTION_SETTING, AUTOLINK_RELATED_NOTES_SECTION_SETTING_DEFAULT,
    MIN_PAGE_LENGTH_SETTING,
    MIN_PAGE_LENGTH_SETTING_DEFAULT
} from "./constants.js";
import {getNoteLinksUUIDFromMarkdown} from "./core/getNoteLinksUUIDFromMarkdown.js";
import { addPageLinksToMarkdown, addSectionLinksToMarkdown, processReplacementMap } from "./core/linker.js";
import {removeLinksFromMarkdown} from "./core/removeLinksFromMarkdown.js";

const plugin = {
    replaceText: async function (app, text) {
        try {
            const textWithFormatting = app.context.selectionContent;
            await plugin._autoLink(app, textWithFormatting, async ({preReplacementMarkdown, replacementMap, originalMap}) => {
                const autoLinkedMarkdown = processReplacementMap(preReplacementMarkdown, replacementMap);
                await app.context.replaceSelection(autoLinkedMarkdown);
            });
        } catch (e) {
            await app.alert(e);
        }
    },
    noteOption: async function(app, noteUUID) {
        try {
            const noteContent = await app.getNoteContent({uuid: noteUUID});
            await plugin._autoLink(app, noteContent, async ({preReplacementMarkdown, replacementMap, originalMap}) => {
                if (replacementMap.size === 0) {
                    return;
                }
                let confirmedReplacements = await app.prompt("Select replacements to apply:", {
                    inputs: Array.from(replacementMap).map(([key, value]) => ({
                        label: `${originalMap.get(key)} ➛ ${value}`,
                        type: "checkbox",
                        value: true
                    }))
                });
                if(!confirmedReplacements) return;
                if(typeof confirmedReplacements === 'boolean')
                    confirmedReplacements = [confirmedReplacements];

                // Create a new Map with only the confirmed replacements
                const finalReplacementMap = new Map();
                Array.from(replacementMap).forEach(([key, value], index) => {
                    if (confirmedReplacements[index]) {
                        finalReplacementMap.set(key, value);
                    }
                    else {
                        finalReplacementMap.set(key, originalMap.get(key));
                    }
                });

                // Apply the confirmed replacements
                const autoLinkedText = processReplacementMap(preReplacementMarkdown, finalReplacementMap);
                await app.replaceNoteContent({uuid: noteUUID}, autoLinkedText);

                const newNoteContent = await app.getNoteContent({uuid: noteUUID});
                if ((await removeLinksFromMarkdown(newNoteContent)).trim() !==
                (await removeLinksFromMarkdown(autoLinkedText)).trim()) {   // Some links may be removed by replaceNoteContent but that's ok
                    console.log('Autolinked note content is different from original note content');
                }
            });
        } catch (e) {
            await app.alert(e);
        }
    },
    async _autoLink(app, text, replaceTextFn) {
        try {
            const pages = await plugin._getPages(app);
            let {preReplacementMarkdown, replacementMap, originalMap} = await addPageLinksToMarkdown(text, pages);
            const isAutoLinkSectionsEnabled = (app.settings[AUTOLINK_RELATED_NOTES_SECTION_SETTING]
            || AUTOLINK_RELATED_NOTES_SECTION_SETTING_DEFAULT) === "true";
            if (preReplacementMarkdown !== text && !isAutoLinkSectionsEnabled) {
                await replaceTextFn({preReplacementMarkdown, replacementMap, originalMap});
            }
            else if (isAutoLinkSectionsEnabled) {
                const sectionMap = await plugin._getSections(app);
                let {preReplacementMarkdown: preReplacementMarkdown2, replacementMap: replacementMap2, originalMap: originalMap2} = await addSectionLinksToMarkdown(preReplacementMarkdown, sectionMap);
                if (preReplacementMarkdown2 !== text) {
                    let preReplacementMarkdownCombined = preReplacementMarkdown2;
                    let replacementMapCombined = new Map([...replacementMap, ...replacementMap2]);
                    let originalMapCombined = new Map([...originalMap, ...originalMap2]);
                    await replaceTextFn({preReplacementMarkdown: preReplacementMarkdownCombined, replacementMap: replacementMapCombined, originalMap: originalMapCombined});
                }
            }
        } catch (e) {
            throw e;
        }
    },
    async _getPages(app) {
        try {
            const allPages = await app.filterNotes({});
            const nonEmptyPages = allPages.filter(page => page.name != null && typeof page.name === 'string' && page.name.trim() !== '');

            app.settings[MIN_PAGE_LENGTH_SETTING] = app.settings[MIN_PAGE_LENGTH_SETTING] || MIN_PAGE_LENGTH_SETTING_DEFAULT;

            const filteredPages = nonEmptyPages.filter(page => page.name.length >= app.settings[MIN_PAGE_LENGTH_SETTING]);

            return filteredPages;
        } catch (e) {
            throw 'Failed _getSortedPages - ' + e;
        }
    },
    async _getSections(app) {
        try {
            // Get backlinks
            const currentNoteBacklinks = await app.getNoteBacklinks({uuid: app.context.noteUUID}); // [{"name": "Top 10 Amplenote Tips","tags": ["reference"],"uuid": "6e02d278-4c16-11ef-858e-26e37c279344","created": "2024-07-27T18:17:48+05:30","updated": "2024-07-27T19:25:22+05:30"},{"name": "July 27th, 2024","tags": ["daily-jots"],"uuid": "6e501c0e-4c16-11ef-858e-26e37c279344","created": "2024-07-27T18:17:47+05:30","updated": "2024-07-27T18:17:47+05:30"},{"name": null,"tags": [],"uuid": "2adf8258-4c1f-11ef-858e-26e37c279344","created": "2024-07-27T19:20:21+05:30","updated": "2024-08-02T20:58:08+05:30"}]

            // Get forward links
            const currentNoteForwardLinks = [];
            const currentPageContent = await app.getNoteContent({uuid: app.context.noteUUID});
            for (const uuid of (await getNoteLinksUUIDFromMarkdown(currentPageContent))) {
                const page = await app.findNote({uuid});
                if (page) {
                    currentNoteForwardLinks.push(page);
                }
            }

            // Get current page
            const currentPage = await app.findNote({uuid: app.context.noteUUID});

            // Get settings
            app.settings[MIN_PAGE_LENGTH_SETTING] = app.settings[MIN_PAGE_LENGTH_SETTING] || MIN_PAGE_LENGTH_SETTING_DEFAULT;

            // Build sections map
            const sectionMap = {};
            for (const note of [...currentNoteBacklinks, ...currentNoteForwardLinks, currentPage]) {
                if (note.uuid) {
                    const sections = await app.getNoteSections({uuid: note.uuid}) || [];
                    sections.forEach(section => {
                        if (section && section.heading && section.heading.text &&
                            section.heading.text.length > app.settings[MIN_PAGE_LENGTH_SETTING]
                            && section.heading.text.trim() !== ''
                            && section.heading.anchor
                            && section.heading.anchor.length > app.settings[MIN_PAGE_LENGTH_SETTING]
                            && section.heading.anchor.trim() !== '') {
                            if (!sectionMap[section.heading.text]) {
                                sectionMap[section.heading.text] = {
                                    anchor: section.heading.anchor,
                                    noteUUID: note.uuid
                                }
                            }
                        }
                    });
                }
            }
            console.log(sectionMap);
            return sectionMap;
        } catch (e) {
            throw 'Failed getSortedSections - ' + e;
        }
    }
}

export default plugin;
