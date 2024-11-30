import {
    USER_PROMPT_LIST_SETTING,
    LLM_API_KEY_SETTING,
    LLM_API_URL_SETTING,
    LLM_MODEL_SETTING,
    PINECONE_API_KEY_SETTING
} from "../../constants.js";

export const EMBED_USER_DATA_MOCK = {
    currentNoteUUID: 'mock-uuid',
    currentNoteTitle: 'Mock Note',
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
            currentNoteUUID: 'mock-uuid',
            currentNoteTitle: 'Mock Note'
        }
    },
    "alert": async (...args) => {
        alert(args.join(' '));
    },
    "getSettings": async () => {
        return {
            [LLM_API_KEY_SETTING]: "",
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1/chat/completions",
            [LLM_MODEL_SETTING]: "llama-3.2-90b-vision-preview",
            [USER_PROMPT_LIST_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usageCount:0},{uuid: 'b', message: "Test B", usageCount:0}]),
            [PINECONE_API_KEY_SETTING]: ""
        }
    }
}
