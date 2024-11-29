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
<mark>Note: This plugin is still in its alpha stage, so you may encounter bugs. Please report them below.</mark>

AI assistant for Amplenote with superpowers.

![Demo](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/4be8e124-0c75-44d7-bb1d-751dd7a4961d.gif)

<mark style="color:undefined;">**Features:**<!-- {"cycleColor":"57"} --></mark>
- [Chat Interface with support for tool calling and custom prompts][^1].
- Support for multiple llm providers: [OpenAI (recommended)](https://platform.openai.com/account/api-keys), [Groq AI Interface (free)](https://console.groq.com/), [FireWorks](https://fireworks.ai/account/api-keys), [Ollama](https://github.com/ollama/ollama).
- Support for various plugin actions: [Continue][^2], Generate, Edit, Quick Command etc.
- [Support for natural language searching][^3].
- A lot more. Too many to list here!

<mark style="color:undefined;">**Common FAQs:**<!-- {"cycleColor":"57"} --></mark>
Q) [How do I set up plugin with OpenAI API?][^4]
Q) [How do I set up plugin with Groq AI Interface?][^5]
Q) [How do I set up plugin with Ollama?][^6]
Q) [What is pinecone?][^7]
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 30/10/2024: Alpha v0.0.1 release

[^1]: [Chat Interface with support for tool calling and custom prompts]()
    
    The chat interface is one of the most powerful features of this plugin. It allows you to interact with the llm in a chat-like interface. The LLM can access enabled tools to perform various actions. It is what makes this plugin so powerful.
    
    To use tools in the chat interface, you need to enable them by typing \`@tool_category_name\` in the chat input. For example, see the attached image. 
    Once enabled, they will be accessible to LLM throughout the chat session.
    
    Currently, the following tool categories are available: \`@tasks\`, \`@notes\`, \`@web\`.
    
    ![](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/12908f45-3ec8-4c34-9be2-a710a3ebea6d.png)
    
[^2]: [Continue]()

    The plugin supports \`{continue\` expression anywhere in note. This will fill in the rest of the paragraph with the LLM.
    
    For better performance compared to AmpleAI, both front and back context is sent to the LLM. 
    
    ![](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/9dcc98ee-8852-43e6-ad05-bffd0bb92619.png)
    
[^3]: [Support for natural language searching]()

    > This search screen needs pinecone to be set up. Pinecone is optional for other screen and chat interface can be used without pinecone.
    
    The plugin supports natural language searching. It uses pinecone to search notes and web pages. 
    
    To start, you need to set up pinecone api key in the plugin settings. Then:
    - Sync notes to pinecone using \`Sync notes to pinecone\` option.
    - Open the search screen using \`Search notes using natural language\` option from app menu (\`CTRL + O\`).
    - Type in the search query.
    
    ![](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/4e1fce1c-1fc8-49cf-bec5-9fe9c4f6fb6e.png)
    
[^4]: [How do I set up plugin with OpenAI API?]()

    To set up plugin with OpenAI API, go to the plugin settings and set settings as below:
    - LLM API Key: \`<<Your API key here>>\`
    - LLM API URL: \`https://api.openai.com/v1/chat/completions\`
    - LLM Model:  \`gpt-4o-mini\`
    
    ![](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/6a1c3523-55e7-464b-9e19-4b1268950736.png)
    
    > For this provider, \`gpt-4o-mini\` model is recommended.

[^5]: [How do I set up plugin with Groq AI Interface?]()

    To set up plugin with Groq AI Interface, go to the plugin settings and set settings as below:
    - LLM API Key: \`<<Your API key here>>\`
    - LLM API URL: \`https://api.groq.com/openai/v1/chat/completions\`
    - LLM Model:  \`llama-3.2-90b-vision-preview\`
    
    ![](https://images.amplenote.com/99c9b8b8-ae63-11ef-92f6-77fd47660337/a1279185-b7eb-437d-bbd0-dde5aa7479a1.png)
    
    > For this provider, \`llama-3.2-90b-vision-preview\` model is recommended.

[^6]: [How do I set up plugin with Ollama?]()

    Documentation for this provider is not available yet. It should be possible to set it up similar to AmpleAI plugin.

[^7]: [What is pinecone?]()

    Pinecone is a vector database that allows you to store and query vectors of text. It is used for natural language search in this plugin.
    
    It is completely optional and required for search screen only. 
`.trim()
};