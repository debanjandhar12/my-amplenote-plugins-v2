import {
    BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING, NOTE_HIGHLIGHT_ORDER_SETTING, OMNIVORE_API_KEY_SETTING,
    OMNIVORE_DASHBOARD_COLUMNS_SETTING,
    OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING,
    OMNIVORE_DASHBOARD_ORDER_SETTING,
    SYNC_ARTICLE_CONTENT_SETTING
} from "./constants.js";

export default {
    name: 'Amplenote Omnivore Sync',
    icon: 'book',
    description: 'A plugin to import and sync web clippings, articles, and highlights from the web app omnivore into amplenote.',
    settings: [OMNIVORE_API_KEY_SETTING, OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING, OMNIVORE_DASHBOARD_ORDER_SETTING,
            OMNIVORE_DASHBOARD_COLUMNS_SETTING, BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING, NOTE_HIGHLIGHT_ORDER_SETTING, SYNC_ARTICLE_CONTENT_SETTING],
    version: '1.3.0',
    instructions: `
This plugin allows you to sync your omnivore web clippings, articles, and highlights into amplenote. To get started:
1. Install the plugin.
2. Go to [https://omnivore.app/settings/api](https://omnivore.app/settings/api) and generate an API key.
3. Go to \`account setting\` > \`plugin\` in amplenote. Select the "Amplenote Omnivore Sync" plugin.
4. Paste the API key into the into the ["${OMNIVORE_API_KEY_SETTING}" field in its plugin settings](https://images.amplenote.com/506ac00a-3077-11ef-b2d3-2aa30a147f2e/600565cc-907d-4eff-b241-69b02d7de034.png). Save the settings.
5. Click Ctrl + O and select "Amplenote Omnivore Sync: Sync all".
![](https://images.amplenote.com/506ac00a-3077-11ef-b2d3-2aa30a147f2e/047c3b21-5af0-46a2-947d-fa07969def74.png)
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 15-08-2024: Initial release
- 18-08-2024: Added experimental support for syncing articles content.
`.trim()
};