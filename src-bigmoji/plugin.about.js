
export default {
    name: 'Bigmoji',
    description: `Insert big emojis into your notes. Supports custom emojis.`,
    settings: [],
    version: '1.0.0',
    icon: 'emoji_emotions',
    instructions: `
This plugin allows users to insert big emojis into their notes. It supports custom emojis and has size selection.

To insert an emoji, select the "Insert emoji" option from the expression menu.
![](https://images.amplenote.com/ad79c98a-8923-11ef-b998-62fb339586e5/6e2da942-28af-4c31-a5e9-4943649791f4.gif)

To modify an emoji, select the "Modify emoji" option from the expression menu.
![](https://images.amplenote.com/ad79c98a-8923-11ef-b998-62fb339586e5/0c242fe8-b444-41f0-b9cc-e065e320bdfc.gif)

Demo video: [https://vimeo.com/1028142650](https://vimeo.com/1028142650)
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>


### Changelog
13/10/2024 - Initial release
10/11/2024 - UI improvements, unicode emoji support
29/03/2025 - Bug fixes
`.trim()
};