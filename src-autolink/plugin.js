import {autoLink} from "./core/linker.js";
import {MIN_PAGE_LENGTH_SETTING_DEFAULT} from "./constants.js";

const plugin = {
    replaceText: async function (app, text) {
        try {
            const pages = await this._getSortedPages(app);
            const textWithFormatting = app.context.selectionContent;
            let autoLinkedText = await autoLink(textWithFormatting, pages);
            if(autoLinkedText !== textWithFormatting) {
                app.context.replaceSelection(autoLinkedText);
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

            app.settings["Min Page Name Length"] = app.settings["Min Page Name Length"] || MIN_PAGE_LENGTH_SETTING_DEFAULT;

            const filteredPages = nonEmptyPages.filter(page => page.name.length >= app.settings["Min Page Name Length"]);

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
    }
}

export default plugin;
