import {AUTOLINK_PLUGIN_VERSION, MIN_PAGE_LENGTH_SETTING} from "./constants.js";

export default {
    name: 'AutoLink',
    description: 'A plugin to creates links your existing notes automatically.',
    icon: 'insert_link',
    settings: [MIN_PAGE_LENGTH_SETTING],
    version: AUTOLINK_PLUGIN_VERSION,
    instructions: `
The plugin automatically creates links for words in selected text that match your existing notes. To use this feature, simply select the desired text and click on the AutoLink option in the floating toolbar:
![](https://images.amplenote.com/f17183ac-0b8f-11ee-a2ea-8683315df6a0/c45e1a8d-163e-4a21-b608-aa95a3e96be9.gif)
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>


### Changelog
15/07/2023 - First version
05/04/2024 - Add support for retaining markdown formatting
28/07/2024 - Greatly improve markdown support
`
};