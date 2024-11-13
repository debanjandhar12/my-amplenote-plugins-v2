import {CUSTOM_PROMPT_SETTING, LLM_API_KEY_SETTING, LLM_API_URL_SETTING, LLM_MODEL_SETTING} from "../../constants.js";

export const EMBED_USER_DATA_MOCK = {
    currentNoteUUID: 'mock-uuid',
    currentNoteTitle: 'Mock Note',
    dailyJotNoteUUID: 'mock-daily-jot-uuid'
}

export const EMBED_COMMANDS_MOCK = {
    "getNoteTitleByUUID": async (noteUUID) => {
        return "Mock Note"
    },
    "insertTask": async (app, ...args) => {
        return true;
    },
    "getUserCurrentNoteData": async () => {
        return {
            currentNoteUUID: 'mock-uuid',
            currentNoteTitle: 'Mock Note'
        }
    },
    "getSettings": async () => {
        return {
            [LLM_API_KEY_SETTING]: "",
            [LLM_API_URL_SETTING]: "https://api.groq.com/openai/v1/chat/completions",
            [LLM_MODEL_SETTING]: "llama-3.2-90b-vision-preview",
            [CUSTOM_PROMPT_SETTING]: JSON.stringify([{uuid:'a', message: "Test A", usage:0},{uuid: 'b', message: "Test B", usage:0}])
        }
    }
}
