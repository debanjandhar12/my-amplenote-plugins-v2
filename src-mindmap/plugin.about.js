export default {
    name: 'Amplenote Mindmap',
    description: 'Visualize your markdown notes in a mindmap',
    settings: [],
    version: '1.0.0',
    icon: 'sync_alt',
    instructions: `
Visualize your markdown notes in a mindmap.

To use this plugin, select "Open as Mindmap" from the note menu.
`.trim().replaceAll('\n', '<br />'),
    template: `
> ⚠️ This is a beta version of the plugin. Please report any issues to the developer.    
    
### Code
<<Code>>


### Changelog
20/07/2024 - First version
`.trim()
};