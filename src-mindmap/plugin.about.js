import {
    INITIAL_EXPAND_LEVEL_SETTING,
    MINDMAP_PLUGIN_VERSION,
    SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING,
    TITLE_AS_DEFAULT_NODE_SETTING
} from "./constants.js";

export default {
    name: 'Amplenote Mindmap',
    description: 'Visualize your markdown notes in a mindmap',
    settings: [TITLE_AS_DEFAULT_NODE_SETTING, INITIAL_EXPAND_LEVEL_SETTING, SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING],
    version: MINDMAP_PLUGIN_VERSION,
    icon: 'sync_alt',
    instructions: `
Visualize your markdown notes in a mindmap.
![](https://images.amplenote.com/073fd84a-46af-11ef-bbe6-26e37c279344/6cc8817a-f183-4899-a8ab-af980ff76101.gif)
To use this plugin, select "Preview mindmap" from the note menu.
`.trim().replaceAll('\n', '<br />'),
    template: `
> ⚠️ This is a beta version of the plugin. Please report any issues to the developer.    
    
### Code
<<Code>>


### Changelog
20/07/2024 - First version
`.trim()
};