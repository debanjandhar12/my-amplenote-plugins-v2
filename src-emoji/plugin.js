import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import emojiHTML from "inline:./embed/emoji.html";

const plugin = {
    insertText: {
        "Insert emoji": async function (app) {
            await app.context.replaceSelection(`![|16px](test.png)`);
            await app.openSidebarEmbed(1, {});
        }
    },
    renderEmbed(app, args, source = 'embed') {
        if(!args) return;
        try {
            const decodedChartData = {};
            return addWindowVariableToHtmlString(emojiHTML, 'emojiData', decodedChartData);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        "insertEmoji": async function (app, emojiCode) {
            console.log(app);
            try {
                await app.openSidebarEmbed(1);
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    })
}

export default plugin;
