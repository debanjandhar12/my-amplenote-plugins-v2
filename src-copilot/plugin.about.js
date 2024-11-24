import {
    USER_PROMPT_LIST_SETTING,
    CUSTOM_LLM_INSTRUCTION_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING,
    PINECONE_API_KEY_SETTING, CUSTOM_LLM_AVATAR_SETTING, LLM_MAX_TOKENS_SETTING
} from "./constants.js";

export default {
    name: 'Ample Copilot',
    description: 'AI plugin with chat interface',
    settings: [PINECONE_API_KEY_SETTING, LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING, LLM_MAX_TOKENS_SETTING,
        CUSTOM_LLM_INSTRUCTION_SETTING, CUSTOM_LLM_AVATAR_SETTING, USER_PROMPT_LIST_SETTING],
    version: '0.0.1',
    icon: 'chat',
    instructions: `
<mark>Note: This plugin is still in its alpha stage, so you may encounter bugs and potential breaking changes.</mark>

AI assistant for Amplenote with superpowers.

<mark style="color:undefined;">**Features:**<!-- {"cycleColor":"57"} --></mark>
- [Chat Interface with support for tool calling and custom prompts][^1].
- Support for multiple llm providers: [Groq AI Interface (free and recommended)](https://console.groq.com/), [OpenAI API](https://platform.openai.com/account/api-keys), [FireWorks](https://fireworks.ai/account/api-keys), [Ollama](https://github.com/ollama/ollama).
- Support for various plugin actions: [Continue][^2], Generate, Edit, Quick Command etc.
- [Support for natural language searching][^3].
- A lot more. Too many to list here!

<mark style="color:undefined;">**Common FAQs:**<!-- {"cycleColor":"57"} --></mark>
Q) [How do I set up plugin with Groq AI Interface?][^4]
Q) [How do I set up plugin with OpenAI API?][^5]
Q) [How do I set up plugin with Ollama?][^6]

<mark style="color:undefined;">**Tutorials:**<!-- {"cycleColor":"57"} --></mark>
1) [How to use tools in Chat Interface? What tools are available?][^8]
2) [What is pinecone? How do I set up pinecone?][^9]
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 24/09/2024: First version

[^4]: [How do I set up plugin with Groq AI Interface?]()
    To set up plugin with Groq AI Interface, go to the plugin settings and set settings as below:
[^5]: [How do I set up plugin with OpenAI API?]()
    To set up plugin with OpenAI API, go to the plugin settings and set settings as below:
[^6]: [How do I set up plugin with Ollama?]()
    To set up plugin with Ollama, go to the plugin settings and set settings as below:
`.trim()
};