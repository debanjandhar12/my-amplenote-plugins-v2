import {PINECONE_API_KEY_SETTING} from "./constants.js";

export default {
    name: 'Ample Copilot',
    description: 'AI plugin with chat interface',
    settings: [PINECONE_API_KEY_SETTING],
    version: '1.0.0',
    icon: 'bar_chart',
    instructions: `
TODO
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 24/09/2024: First version
`.trim()
};