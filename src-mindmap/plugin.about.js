import {
    INITIAL_EXPAND_LEVEL_SETTING,
    SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING,
    TITLE_AS_DEFAULT_NODE_SETTING
} from "./constants.js";

export default {
    name: 'Amplenote Mindmap',
    description: 'Visualize your markdown notes in a mindmap',
    settings: [TITLE_AS_DEFAULT_NODE_SETTING, INITIAL_EXPAND_LEVEL_SETTING, SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING],
    version: '1.0.0',
    icon: 'account_tree',
    instructions: `
Visualize your markdown notes in a mindmap.
![](https://images.amplenote.com/073fd84a-46af-11ef-bbe6-26e37c279344/6cc8817a-f183-4899-a8ab-af980ff76101.gif)
To use this plugin, select "Preview mindmap" from the note menu.

**Features:**
- Preview your notes as a Mind Map
- Instant reload mindmap by clicking reload toolbar button.
- Support for filtering nodes.
- Download mindmap as image.

**Common FAQ:**
Q) [Mindmap shows too much details. How do I reduce detailing?][^1] 
Q) [How to set initial expand level detailing?][^2] 
`.trim().replaceAll('\n', '<br />'),
    template: `
    
### Code
<<Code>>


### Changelog
20/07/2024 - First version
06/08/2024 - Bug fixes
17-08-2024 - Added additional options + download as png feature
24-08-2024 - Added header anchor links + additional options

[^1]: [Mindmap shows too much details. How do I reduce detailing?]()
    Changing the "Show only siblings at current level" setting to true should show important parts of the note only.
[^2]: [How to set initial expand level detailing?]()
    The initial expand level can be set by setting the "Initial expand level" setting to the desired level.
`.trim()
};