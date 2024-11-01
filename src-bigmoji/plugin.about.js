
export default {
    name: 'Bigmoji',
    description: `Insert big emojis into your notes. Supports custom emojis.`,
    settings: [],
    version: '1.0.0',
    icon: 'emoji_emotions',
    instructions: `
This plugin allows users to insert big emojis into their notes. It supports custom emojis and has size selection.

To insert an emoji, select the "Insert emoji" option from the expression menu.

To modify an emoji, select the "Modify emoji" option from the expression menu.
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>


### Changelog
13/10/2024 - Initial release
`.trim()
};