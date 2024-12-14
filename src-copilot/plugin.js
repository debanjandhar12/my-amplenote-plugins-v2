import chatHTML from 'inline:./embed/chat.html';
import searchHTML from 'inline:./embed/search.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";
import {generateText} from "./ai-backend/generateText.js";
import {getLLMModel} from "./ai-backend/getLLMModel.js";
import {Pinecone} from "./pinecone/Pinecone.js";

const plugin = {
    currentNoteUUID: null,
    insertText: {
        "Continue": async function (app) {
            try {
                // Get nearby content to caret position
                const randomUUID = Math.random().toString(36).substring(7);
                await app.context.replaceSelection(`${randomUUID}`);    // Trick to figure out caret position
                const noteContent =
                    `----\nnote-title: ${(await app.notes.find(app.context.noteUUID)).name}\n----\n\n` +
                    await app.getNoteContent({uuid: app.context.noteUUID});
                const nearbyContent = noteContent.substring(noteContent.indexOf(randomUUID) - 800, noteContent.indexOf(randomUUID) + 800);
                // Ask llm to fill
                await app.context.replaceSelection(`Generating...`);
                const prompt = "I want you to act as a fill in the mask tool. You take markdown input text and complete it factually. Only reply with words that should replace [MASK]. NEVER repeat input." + "\n" +
                    "Additional instruction: If the surrounding text is in between a sentence, complete the entire sentence. Otherwise, complete the paragraph. DO NOT repeat the input text." + "\n" +
                    "Examples:" + "\n" +
                    "Input:The [MASK] jumps over the lazy dog." + "\n" +
                    "Output:quick brown fox" + "\n" +
                    "Input:The quick brown fox jumps[MASK]" + "\n" +
                    "Output: over the lazy dog." + "\n" +
                    "Input:On the way, we caught sight of the famous waterfall. [MASK]" + "\n" +
                    "Output:A rainbow formed in the mist as we stood there. The sight was truly captivating." + "\n" +
                    "---------------------" + "\n" +
                    "Input: " + "\n" +
                    nearbyContent.replaceAll(randomUUID, '[MASK]');
                const response = await generateText(await getLLMModel(app.settings), prompt);
                if (response.text) {
                    let responseText = response.text;
                    if (responseText.startsWith('Output:') &&
                        !(nearbyContent.toLowerCase().includes('input')
                            || nearbyContent.toLowerCase().includes('output'))) {
                        responseText = responseText.substring(6);   // Remove the "Output:" prefix
                    }
                    const lastCharInOriginalContent = nearbyContent.substring(noteContent.indexOf(randomUUID) - 1);
                    const firstCharInResponse = responseText.substring(0, 1);
                    if (lastCharInOriginalContent === firstCharInResponse
                        && firstCharInResponse === ' ') {
                        responseText = responseText.substring(1);   // Remove the first space
                    }
                    await app.context.replaceSelection(responseText);
                }
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
                const prompt = "I want you to generate markdown text based on the following instructions. Do not reply anything other than the generated text on provided topic. Instructions:" + "\n" +
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
            await plugin.onEmbedCall(app, 'syncNotesWithPinecone');
        },
        "Chat with Copilot": async function (app) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'appOption', openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Search notes using natural language": async function (app) {
            try {
                plugin.currentNoteUUID = app.context.noteUUID;
                await app.openSidebarEmbed(1, {trigger: 'appOption', openSearch: true});
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
            } else if (args.openSearch) {
                return searchHTML;
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
                if (!currentNoteUUID) return null;
                const currentNote = await app.findNote({uuid: currentNoteUUID});
                if (!currentNote) return null;
                return {
                    currentNoteUUID: currentNote.uuid,
                    currentNoteTitle: currentNote.name
                }
            } catch (e) {
                throw 'Failed getUserCurrentNoteData - ' + e;
            }
        },
        "syncNotesWithPinecone": async function (app) {
            try {
                const pinecone = new Pinecone();
                await pinecone.syncNotes(app);
                await app.alert("Sync completed");
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    }, ['getUserCurrentNoteData'])
}

export default plugin;
