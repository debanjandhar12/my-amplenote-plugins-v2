import {
    CUSTOM_PROMPT_SETTING,
    CUSTOM_LLM_INSTRUCTION_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING,
    PINECONE_API_KEY_SETTING
} from "./constants.js";

export default {
    name: 'Ample Copilot',
    description: 'AI plugin with chat interface',
    settings: [PINECONE_API_KEY_SETTING, LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING,
        CUSTOM_LLM_INSTRUCTION_SETTING, CUSTOM_PROMPT_SETTING],
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