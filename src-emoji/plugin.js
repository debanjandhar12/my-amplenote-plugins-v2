import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    insertText: {
        "Insert emoji": async function (app) {
            try {
                const emojiConfig = {
                    uuid: Math.random().toString(36).substring(7),
                    emojiCode: 'grinning-face',
                    url: null,
                    size: '16px'
                }
                await app.context.replaceSelection(`![|16px](https://openmoji.org/data/color/png/1F600.png?emojiConfig=${encodeURIComponent(JSON.stringify(emojiConfig))})`);
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed(app, args, source = 'embed') {
        try {
            const decodedChartData = JSON.parse(decodeURIComponent(args));
            return addWindowVariableToHtmlString(chartHTML, 'chartData', decodedChartData);
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS
    })
}

export default plugin;
