import chatHTML from 'inline:./embed/chat.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {syncNotes} from "./pinecone/syncNotes.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {generateText} from "./ai-backend/generateText.js";
import {getLLMModel} from "./ai-backend/getLLMModel.js";

const plugin = {
    currentNoteUUID: null,
    insertText: {
        "Continue": async function (app) {
            try {
                // Get nearby content to caret position
                const randomUUID = Math.random().toString(36).substring(7);
                await app.context.replaceSelection(`${randomUUID}`);    // Trick to figure out caret position
                const noteContent =
                    `----\nnote-title: ${(await app.notes.find(app.context.noteUUID)).name}\n----\n` +
                    await app.getNoteContent({uuid: app.context.noteUUID});
                const nearbyContent = noteContent.substring(noteContent.indexOf(randomUUID) - 800, noteContent.indexOf(randomUUID) + 800);
                // Ask llm to fill
                await app.context.replaceSelection(`Generating...`);
                const prompt = "I want you to act as a fill in the blank tool. You take the input and complete it factually. Only reply with words that should replace [BLANK]. NEVER repeat input." + "\n" +
                    "Additional instruction: If the surrounding text is in between a sentence, complete the entire sentence. Otherwise, complete the paragraph. DO NOT repeat the input text." + "\n" +
                    "Example:" + "\n" +
                    "Input: The quick brown fox jumps [CONTINUE]." + "\n" +
                    "Output: over the lazy dog." + "\n" +
                    "Example 2:" + "\n" +
                    "Input: I’m fine, thanks. [CONTINUE]." + "\n" +
                    "Output: How are you?" + "\n" +
                    "---------------------" + "\n" +
                    "Input: " + "\n" +
                    nearbyContent.replaceAll(randomUUID, '[CONTINUE]');
                const response = await generateText(await getLLMModel(app.settings), prompt);
                if (response.text)
                    await app.context.replaceSelection(response.text);
                else
                    throw new Error('LLM response is empty');
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Generate text": async function (app) {
            try {
                const instructions = await app.prompt("Enter text generation instructions:");
                if (!instructions) return;
                const prompt = "I want you to generate text based on the following instructions. You can use markdown. Do not reply anything other than the generated text on provided topic. Instructions:" + "\n" +
                    instructions.trim() + "\n";
                const response = await generateText(await getLLMModel(app.settings), prompt);
                if (response.text)
                    await app.context.replaceSelection(response.text);
                else
                    throw new Error('LLM response is empty');
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    appOption: {
        "Sync notes to pinecone": async function (app) {
            try {
                await syncNotes(app);
                await app.alert("Sync completed");
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Chat with Copilot": async function (app) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'appOption', openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    replaceText: {
        "Edit": async function (app, selectionContent) {
            try {
                const instructions = await app.prompt("Enter edit instructions:");
                if (!instructions) return;
                const prompt = "I want you to edit the following text based on the following instructions. You can use markdown. DO not reply anything other than the edited text. Instructions:" + "\n" +
                    instructions.trim() + "\n" +
                    "---------------------" + "\n" +
                    "Input: " + "\n" +
                    selectionContent.trim();
                const response = await generateText(await getLLMModel(app.settings), prompt);
                if (response.text)
                    await app.context.replaceSelection(response.text);
                else
                    throw new Error('LLM response is empty');
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Chat with Copilot": async function (app, selectionContent) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'replaceSelection', selectionContent: app?.context?.selectionContent || selectionContent, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    noteOption: {
        "Chat with Copilot": async function (app, noteUUID) {
            try {
                plugin.currentNoteUUID = noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'noteOption', noteUUID, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    imageOption: {
        "Chat with Copilot": async function (app, image) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'imageOption', image, openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    renderEmbed: async function (app, args, source = 'embed') {
        try {
            if (args.openChat) {
                let userData = {};
                if (args.trigger === 'noteOption') {
                    const noteInfo = await app.findNote({uuid: args.noteUUID});
                    userData = {...userData, invokerNoteUUID: args.noteUUID, invokerNoteTitle: noteInfo.name};
                } else if (args.trigger === 'imageOption') {
                    userData = {...userData, invokerImageSrc: args.image.src};
                } else if (args.trigger === 'replaceSelection') {
                    userData = {...userData, invokerSelectionContent: args.selectionContent};
                }
                const dailyJotNote = await app.notes.dailyJot(Math.floor(Date.now() / 1000));
                const dailyJotNoteUUID = (await dailyJotNote.url()).split('/').pop();
                userData = {...userData, dailyJotNoteUUID: dailyJotNoteUUID, dailyJotNoteTitle: dailyJotNote.name};
                return addWindowVariableToHtmlString(chatHTML, 'userData', userData);
            }
        } catch (e) {
            console.error(e);
            return 'Error parsing object tag';
        }
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        "getUserCurrentNoteData": async (app) => {
            try {
                const currentNoteUUID = app.context.noteUUID || plugin.currentNoteUUID;
                const currentNote = await app.findNote({uuid: currentNoteUUID});
                return {
                    currentNoteUUID: currentNote.uuid,
                    currentNoteTitle: currentNote.name
                }
            } catch (e) {
                throw 'Failed getUserCurrentNoteData - ' + e;
            }
        }
    })
}

export default plugin;
