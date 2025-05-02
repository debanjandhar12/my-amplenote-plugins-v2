import {
    USER_PROMPT_LIST_SETTING,
    CUSTOM_LLM_INSTRUCTION_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING,
    CUSTOM_LLM_AVATAR_SETTING,
    LLM_MAX_TOKENS_SETTING,
    EMBEDDING_API_URL_SETTING,
    EMBEDDING_API_KEY_SETTING,
    MCP_SERVER_URL_LIST_SETTING
} from "./constants.js";

export default {
    name: 'Ample Copilot',
    description: 'Next-gen AI plugin with chat ui and natural language searching.',
    settings: [LLM_API_URL_SETTING, LLM_API_KEY_SETTING, LLM_MODEL_SETTING, LLM_MAX_TOKENS_SETTING,
        CUSTOM_LLM_INSTRUCTION_SETTING, CUSTOM_LLM_AVATAR_SETTING,
        EMBEDDING_API_URL_SETTING, EMBEDDING_API_KEY_SETTING,
        MCP_SERVER_URL_LIST_SETTING, USER_PROMPT_LIST_SETTING],
    version: '0.4.0',
    icon: 'chat',
    instructions: `
The plugin brings powerful AI features to Amplenote, including the ability to query all your notes for answers and insights, and to interactively edit or rewrite them with AI chat.

![Demo](https://images.amplenote.com/93d25f9e-b4c3-11ef-ba27-d3c11d33cbac/8344c634-a1a4-4423-8ca0-eb7adf6b91a8.gif)

**✨** <mark style="color:undefined;">**Features:**<!-- {"cycleColor":"57"} --></mark>
- [Chat UI with support for tool calling](https://public.amplenote.com/he5yXPoUsXPsYBKbH37vEvZb)
- Support for multiple embeddings & llm providers: [OpenAI (recommended)](https://platform.openai.com/account/api-keys), [Google AI Studio (free)](https://aistudio.google.com/apikey), [FireWorks (free $1)](https://fireworks.ai/account/api-keys), [Ollama](https://github.com/ollama/ollama) and [Groq](https://console.groq.com).
- [Natural language search support](https://public.amplenote.com/jKhhLtHMaSDGM8ooY4R9MiYi)
- Support for quick plugin actions: [Continue][^1], Generate Text & Image, Summarize, Rewrite, etc.
- A lot more. Too many to list here!

**🧠** <mark style="color:undefined;">**Chat Documentation:**<!-- {"cycleColor":"57"} --></mark>
Q) [How to set up LLM API?](https://public.amplenote.com/SZnCDvp9yU7CbCzkn7RJowcV#1._Setting_up_LLM_Providers)
Q) [How to use tools?](https://public.amplenote.com/he5yXPoUsXPsYBKbH37vEvZb#Using_Tools_%28%40notes%2C_%40tasks%2C_%40web%2C_%40help%29)
Q) [How to use custom prompts?](https://public.amplenote.com/he5yXPoUsXPsYBKbH37vEvZb#Using_Custom_Prompts)

<mark style="color:undefined;">*ℹ️ For amplenote / plugin related questions, you can type \`@help <your question>\` in chat.*<!-- {"cycleColor":"44"} --></mark>

**🔍** <mark style="color:undefined;">**Natural Language Search Documentation:**<!-- {"cycleColor":"57"} --></mark>
Q) [How does natural language search work?](https://public.amplenote.com/jKhhLtHMaSDGM8ooY4R9MiYi#How_it_Works%3A_LocalVecDB_%26_Embeddings)
Q) [How to use sync notes to LocalVecDB?](https://public.amplenote.com/jKhhLtHMaSDGM8ooY4R9MiYi#Syncing_Notes_with_LocalVecDB)
Q) [How to use natural language search?](https://public.amplenote.com/jKhhLtHMaSDGM8ooY4R9MiYi#Using_Natural_Language_Search)
Q) [How to set up embedding API (recommended)?](https://public.amplenote.com/SZnCDvp9yU7CbCzkn7RJowcV#2._Setting_up_Embedding_Providers)

<mark style="color:undefined;">*ℹ️ For bigger vaults, it is highly recommended to provide embedding api url and key.*<!-- {"cycleColor":"44"} --></mark>

-----
<mark>💡 This plugin is currently in its beta stage. If you encounter any issues, please report them.</mark>
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 30/10/2024: Alpha v0.0.1 release
- 27/12/2024: Beta v0.1.0 release
- 27/12/2024: Beta v0.1.1 release
- 10/01/2024: Beta v0.2.0 release
- 03/03/2025: Beta v0.3.0 release
- 12/04/2025: Beta v0.4.0 release

[^1]: [Continue]()

    The plugin supports \`{continue\` expression anywhere in note. This will fill in the rest of the paragraph with the LLM.
    
    For better performance compared to AmpleAI, both front and back context is sent to the LLM. 
`.trim()
};