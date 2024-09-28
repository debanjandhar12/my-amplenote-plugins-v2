import {
    AUTOLINK_RELATED_NOTES_SECTION_SETTING,
    MIN_PAGE_LENGTH_SETTING
} from "./constants.js";

export default {
    name: 'AutoLink',
    description: 'A plugin to creates links your existing notes automatically.',
    icon: 'insert_link',
    settings: [MIN_PAGE_LENGTH_SETTING,
        AUTOLINK_RELATED_NOTES_SECTION_SETTING],
    version: '2.2.0',
    instructions: `
The plugin automatically links words in your selected text to existing notes (and sections of existing notes).
![](https://images.amplenote.com/f17183ac-0b8f-11ee-a2ea-8683315df6a0/c45e1a8d-163e-4a21-b608-aa95a3e96be9.gif)

<mark style="color:undefined;">**Steps to autolink selected text:**<!-- {"cycleColor":"57"} --></mark>
- Select the desired text and click on the AutoLink option.
- The plugin will create links.

<mark style="color:undefined;">**Steps to autolink notes:**<!-- {"cycleColor":"57"} --></mark>
- Select <code>Plugin > AutoLink</code> from the note menu.
- Select desired links for autolinking. The plugin will create the links.

<b>Common FAQ:</b>
Q) [How do I enable autolinking to sections of existing notes?][^1] 
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>


### Changelog
- 15/07/2023: First version
- 05/04/2024: Add support for retaining markdown formatting
- 28/07/2024: Introduce full page noteOption. Greatly improve markdown support. Also, added experimental support for section linking.
- 13/09/2024: Reduced bundle size + Bug fixes. Also, added replacement selection support when triggering the plugin from noteOption.
- 28/09/2024: Reduced bundle size.

[^1]: [How do I enable autolinking to sections of existing notes?]()
    To enable autolinking to sections of existing notes, go to the plugin settings and set "Autolink Related Notes Section" setting to "true".
`
};