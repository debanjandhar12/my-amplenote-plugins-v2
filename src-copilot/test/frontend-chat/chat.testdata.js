import {
    USER_PROMPT_LIST_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING, MCP_SERVER_URL_LIST_SETTING,
} from "../../constants.js";
import {dynamicImportEnv} from "../../../common-utils/dynamic-import-env.js";

export const EMBED_COMMANDS_MOCK = {
    "filterNotes": async (...args) => {
        return [];
    },
    "searchNotesInCopilotDB": async (...args) => {
        return [];
    },
    "getNoteTitleByUUID": async (noteUUID) => {
        return "Mock Note"
    },
    "getNoteContentByUUID": async (noteUUID) => {
        return ""
    },
    "insertTask": async (...args) => {
        return true;
    },
    "updateTask": async (...args) => {
        return true;
    },
    "ping": async () => {
        return true;
    },
    "receiveMessageFromPlugin": async () => {
        return null;
    },
    "getUserCurrentNoteData": async () => {
        return {
            currentNoteUUID: 'mock-uuid'
        }
    },
    "getUserDailyJotNote": async () => {
        return {
            dailyJotNoteUUID: 'mock-daily-jot-uuid',
            dailyJotNoteName: new Date().toISOString('dd-MM-yyyy')
        }
    },
    "alert": async (...args) => {
        alert(args.join(' '));
    },
    "navigate": async (url) => {
        window.open(url, '_blank');
        return true;
    },
    "getSettings": async () => {
        await dynamicImportEnv();
        return {
            ...getLLMProviderSettings('groq'),
            [MCP_SERVER_URL_LIST_SETTING]: process.env.MCP_URL,
            [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}]),
        }
    },
    "getChatThreadFromCopilotDB": async (threadId) => {
        return null;
    },
    "saveChatThreadToCopilotDB": async (thread) => {
        return true;
    },
    "getAllChatThreadsFromCopilotDB": async () => {
        return [];
    },
    "getLastOpenedChatThreadFromCopilotDB": async () => {
        return null;
    },
    "searchUserTasks": async (app, sqlQuery) => {
        await new Promise(resolve => setTimeout(resolve, 4000));
        // throw new Error("Error in searchUserTasks");
        return {
            success: true,
            taskCount: 0,
            results: [],
            resultCount: 0
        };
    }
}

export const getLLMProviderSettings = (provider) => {
    if (provider === 'groq') {
        return {
            [LLM_API_KEY_SETTING]: process.env.GROQ_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1",
            [LLM_MODEL_SETTING]: "meta-llama/llama-4-scout-17b-16e-instruct"
        }
    } else if (provider === 'openai') {
        return {
            [LLM_API_KEY_SETTING]: process.env.OPENAI_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.openai.com/v1",
            [LLM_MODEL_SETTING]: "gpt-4o-mini"
        }
    }
    else if (provider === 'google') {
        return {
            [LLM_API_KEY_SETTING]: process.env.GOOGLE_API_KEY,
            [LLM_API_URL_SETTING]: "https://generativelanguage.googleapis.com/v1beta",
            [LLM_MODEL_SETTING]: "gemini-2.0-flash"
        }
    } else if (provider === 'fireworks') {
        return {
            [LLM_API_KEY_SETTING]: process.env.FIREWORKS_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.fireworks.ai/inference/v1",
            [LLM_MODEL_SETTING]: "deepseek-v3"
        }
    } else if (provider === 'local') {
        return {
            [LLM_API_KEY_SETTING]: '',
            [LLM_API_URL_SETTING]: "http://localhost:11434/api",
            [LLM_MODEL_SETTING]: "qwen/qwen3-32b"
        }
    }
    throw new Error(`Dummy setting data for provider not found: ${provider}`);
}