import {
    USER_PROMPT_LIST_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING, EMBEDDING_SERVER_URL_LIST_SETTING,
} from "../../constants.js";
import {dynamicImportEnv} from "../../../common-utils/dynamic-import-env.js";

export const EMBED_COMMANDS_MOCK = {
    "filterNotes": async (...args) => {
        return [];
    },
    "searchNotesInLocalVecDB": async (...args) => {
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
            ...getLLMProviderSettings('google'),
            [EMBEDDING_SERVER_URL_LIST_SETTING]: process.env.MCP_URL,
            [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}]),
        }
    }
}

export const getLLMProviderSettings = (provider) => {
    if (provider === 'groq') {
        return {
            [LLM_API_KEY_SETTING]: process.env.GROQ_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1",
            [LLM_MODEL_SETTING]: "llama-3.2-90b-vision-preview"
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
    }
    throw new Error(`Dummy setting data for provider not found: ${provider}`);
}