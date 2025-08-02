// User configurable settings
export const LLM_API_URL_SETTING = "LLM API URL";
export const LLM_API_KEY_SETTING = "LLM API Key";
export const LLM_MODEL_SETTING = "LLM Model";
export const LLM_MAX_TOKENS_SETTING = "LLM Max Tokens (Optional)";
export const CUSTOM_LLM_INSTRUCTION_SETTING = "Custom LLM Instruction (Optional)";
export const CUSTOM_LLM_AVATAR_SETTING = "Custom LLM Avatar (Optional)";
export const USER_PROMPT_LIST_SETTING = "User Prompt List (DO NOT CHANGE MANUALLY)";
export const EMBEDDING_API_URL_SETTING = "Embedding API URL (Optional)";
export const EMBEDDING_API_KEY_SETTING = "Embedding API Key (Optional)";
export const MCP_SERVER_URL_LIST_SETTING = "MCP Server List (Optional)";

// Unused settings
export const PINECONE_API_KEY_SETTING = "Pinecone API Key (Optional)";

// Version Config
export const PLUGIN_VERSION = "0.8.0";

// Vector DB Configs
export const COPILOT_DB_INDEX_VERSION = 53;
export const COPILOT_DB_MAX_TOKENS = 1280;
export const MAX_NOTE_BATCH_SIZE = 48;
export const MAX_CHAT_HISTORY_THREADS = 100;

// Chat Configs
export const LLM_MAX_STEPS = 8;
export const MAX_TOOL_RESULT_LENGTH1 = 15000;    // 5k tokens - all remaining tools
export const MAX_TOOL_RESULT_LENGTH2 = 30000;    // 10k tokens - used for search notes and help center
export const MAX_TOOL_RESULT_LENGTH3 = 42000;    // 14k tokens - used for FetchNoteDetailByNoteUUID