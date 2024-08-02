import {autoLinkMarkdownWithPageLinks, autoLinkMarkdownWithSectionLinks} from "./core/linker.js";
import {
    AUTOLINK_RELATED_NOTES_SECTION_SETTING, AUTOLINK_RELATED_NOTES_SECTION_SETTING_DEFAULT,
    MIN_PAGE_LENGTH_SETTING,
    MIN_PAGE_LENGTH_SETTING_DEFAULT
} from "./constants.js";
import {getNoteLinksUUIDFromMarkdown} from "./core/getNoteLinksUUIDFromMarkdown.js";

const plugin = {
    replaceText: async function (app, text) {
        try {
            const pages = await this._getSortedPages(app);
            const textWithFormatting = app.context.selectionContent;
            let autoLinkedText = await autoLinkMarkdownWithPageLinks(textWithFormatting, pages);
            if(autoLinkedText !== textWithFormatting) {
                await app.context.replaceSelection(autoLinkedText);
            }
            if (app.settings[AUTOLINK_RELATED_NOTES_SECTION_SETTING] || AUTOLINK_RELATED_NOTES_SECTION_SETTING_DEFAULT) {
                const sectionMap = await this._getSortedSections(app);
                autoLinkedText = await autoLinkMarkdownWithSectionLinks(autoLinkedText, sectionMap);
                if(autoLinkedText !== textWithFormatting) {
                    await app.context.replaceSelection(autoLinkedText);
                }
            }
        } catch (e) {
            app.alert(e);
        }
        return null;
    },
    async _getSortedPages(app) {
        try {
            const allPages = await app.filterNotes({});
            const nonEmptyPages = allPages.filter(page => page.name != null && typeof page.name === 'string' && page.name.trim() !== '');

            app.settings[MIN_PAGE_LENGTH_SETTING] = app.settings[MIN_PAGE_LENGTH_SETTING] || MIN_PAGE_LENGTH_SETTING_DEFAULT;

            const filteredPages = nonEmptyPages.filter(page => page.name.length >= app.settings[MIN_PAGE_LENGTH_SETTING]);

            const sortedPages = filteredPages.sort((a, b) => {
                if (a.name > b.name) {
                    return -1;
                }
                if (a.name < b.name) {
                    return 1;
                }
                return 0;
            });
            return sortedPages;
        } catch (e) {
            throw 'Failed _getSortedPages - ' + e;
        }
    },
    async _getSortedSections(app) {
        try {
            // Get backlinks
            const currentNoteBacklinks = await app.getNoteBacklinks({ uuid: app.context.noteUUID }); // [{"name": "Top 10 Amplenote Tips","tags": ["reference"],"uuid": "6e02d278-4c16-11ef-858e-26e37c279344","created": "2024-07-27T18:17:48+05:30","updated": "2024-07-27T19:25:22+05:30"},{"name": "July 27th, 2024","tags": ["daily-jots"],"uuid": "6e501c0e-4c16-11ef-858e-26e37c279344","created": "2024-07-27T18:17:47+05:30","updated": "2024-07-27T18:17:47+05:30"},{"name": null,"tags": [],"uuid": "2adf8258-4c1f-11ef-858e-26e37c279344","created": "2024-07-27T19:20:21+05:30","updated": "2024-08-02T20:58:08+05:30"}]

            // Get forward links
            const currentNoteForwardLinks = [];
            const currentPageContent = await app.getNoteContent({ uuid: app.context.noteUUID });
            for (const uuid of (await getNoteLinksUUIDFromMarkdown(currentPageContent))) {
                const page = await app.findNote({ uuid });
                if (page) {
                    currentNoteForwardLinks.push(page);
                }
            }

            // Get current page
            const currentPage = await app.findNote({ uuid: app.context.noteUUID });

            // Get settings
            app.settings[MIN_PAGE_LENGTH_SETTING] = app.settings[MIN_PAGE_LENGTH_SETTING] || MIN_PAGE_LENGTH_SETTING_DEFAULT;

            // Build sections map
            const sectionMap = {};
            for (const note of [...currentNoteBacklinks, ...currentNoteForwardLinks, currentPage]) {
                if (note.uuid) {
                    const sections = await app.getNoteSections({ uuid: note.uuid }) || [];
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
            return sectionMap;
        }
        catch (e) {
            throw 'Failed getSortedSections - ' + e;
        }
    }
}

export default plugin;
