import {
    USER_PROMPT_LIST_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING,
    PINECONE_API_KEY_SETTING, LAST_PINECONE_SYNC_TIME_SETTING
} from "../../constants.js";
import {dynamicImportEnv} from "../../../common-utils/dynamic-import-env.js";

export const EMBED_USER_DATA_MOCK = {
    currentNoteUUID: 'mock-uuid',
    dailyJotNoteUUID: 'mock-daily-jot-uuid',
    dailyJotNoteTitle: 'Mock Note'
}

export const EMBED_COMMANDS_MOCK = {
    "getNoteTitleByUUID": async (noteUUID) => {
        return "Mock Note"
    },
    "insertTask": async (...args) => {
        return true;
    },
    "updateTask": async (...args) => {
        return true;
    },
    "getUserCurrentNoteData": async () => {
        return {
            currentNoteUUID: 'mock-uuid'
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
            [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}]),
            [PINECONE_API_KEY_SETTING]: process.env.PINECONE_API_KEY,
            [LAST_PINECONE_SYNC_TIME_SETTING]: new Date().toISOString()
        }
    }
}

export const getLLMProviderSettings = (provider) => {
    if (provider === 'groq') {
        return {
            [LLM_API_KEY_SETTING]: process.env.GROQ_LLM_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1/chat/completions",
            [LLM_MODEL_SETTING]: "llama-3.2-90b-vision-preview"
        }
    } else if (provider === 'openai') {
        return {
            [LLM_API_KEY_SETTING]: process.env.OPENAI_LLM_API_KEY,
            [LLM_API_URL_SETTING]: "https://api.openai.com/v1/chat/completions",
            [LLM_MODEL_SETTING]: "gpt-4o-mini"
        }
    }
}