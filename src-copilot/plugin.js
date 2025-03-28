import chatHTML from 'inline:./embed/chat.html';
import searchHTML from 'inline:./embed/search.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {generateText} from "./backend/generateText.js";
import {getLLMModel} from "./backend/getLLMModel.js";
import {LLM_API_URL_SETTING} from "./constants.js";
import {getImageModel} from "./backend/getImageModel.js";
import {generateImage} from "./backend/generateImage.js";
import {LocalVecDB} from "./LocalVecDB/LocalVecDB.js";
import {getSyncState} from "./LocalVecDB/getSyncState.js";
import {getMatchedPartWithFuzzySearch} from "./utils/getMatchedPartWithFuzzySearch.jsx";

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
        },
        "Generate image": {
            check: async function (app, image) {
                try {
                    if (app.settings[LLM_API_URL_SETTING].trim() !== '') {
                        const imageModel = await getImageModel(app.settings);
                        return !!imageModel;
                    }
                } catch (e) { console.error(e); }
                return false;
            },
            run: async function (app) {
                try {
                    const imageModel = await getImageModel(app.settings);
                    const [prompt, size] = await app.prompt("", {
                        inputs: [
                            { label: "Image generation instructions:", type: "text", value: "" },
                            { label: "Image size:", type: "select", options: [
                                    { label: "512x512", value: "512" },
                                    { label: "1024x1024", value: "1024" }
                                ], value: "512" }
                        ]
                    });
                    const response = await generateImage(imageModel, prompt, size);
                    console.log('response', response);
                    if (response.image) {
                        const imgUrl = await app.attachNoteMedia({uuid: app.context.noteUUID}, 'data:image/webp;base64,' +response.image.base64);
                        await app.context.replaceSelection(`![](${imgUrl})`);
                    }
                    else {
                        throw new Error('LLM response is empty');
                    }
                } catch (e) {
                    console.error(e);
                    await app.alert(e);
                }
            }
        }
    },
    appOption: {
        "Search notes using natural language": async function (app) {
            try {
                await app.openSidebarEmbed(1, {trigger: 'appOption', openSearch: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Sync notes with LocalVecDB": async function (app) {
            try {
                await plugin.sendMessageToEmbed(app, 'startSyncToLocalVecDBInSearchInterface', true);
                await app.openSidebarEmbed(1, {trigger: 'appOption', openSearch: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Chat with Copilot": async function (app) {
            try {
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
                // TODO: Use prompt from ModifyNoteContent tool?
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
        "Chat with selection": {
            check: async function (app, selectionContent) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app, selectionContent) {
                await app.openSidebarEmbed(1, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'selection', noteUUID: app?.context?.noteUUID, selectionContent: selectionContent});
            }
        },
        "Add selection to chat": {
            check: async function (app, selectionContent) {
                return await plugin.isEmbedOpen(app);
            },
            run: async function (app, selectionContent) {
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'selection', noteUUID: app?.context?.noteUUID, selectionContent: selectionContent});
            }
        },
        "More options": async function (app, selectionContent) {
            try {
                const action = await app.prompt("Enter prompt type:", {
                    inputs: [
                        { label: "", type: "select", options: [
                                { label: "Rephrase", value: "Rephrase" },
                                { label: "Fix grammar", value: "Fix grammar in" },
                                { label: "Summarize", value: "Summarize" },
                                { label: "Explain", value: "Explain" },
                            ], value: "Rephrase" }
                    ]
                });
                if (!action) return;
                const prompt = `${action} the following text:\n` + selectionContent;
                const response = await generateText(await getLLMModel(app.settings), prompt);
                if (response.text) {
                    const shouldReplace = await app.alert(response.text, {
                        preface: "Copilot response:",
                        actions: [
                            { label: "Replace", value: "replace", icon: "edit" },
                        ]
                    });
                    if (shouldReplace === "replace") {
                        await app.replaceNoteContent({uuid: app.context.noteUUID}, response.text);
                    }
                } else {
                    throw new Error('LLM response is empty');
                }
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    noteOption: {
        "Chat": {
            check: async function (app) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app) {
                await app.openSidebarEmbed(1, {openChat: true});
            }
        },
        "Chat with note": {
            check: async function (app, noteUUID) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app, noteUUID) {
                await app.openSidebarEmbed(1, {openChat: true});
                const note = await app.findNote({uuid: noteUUID});
                const noteContent = await app.getNoteContent({uuid: noteUUID});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'note', noteUUID: noteUUID, noteTitle: note.name, noteContent: noteContent});
            }
        },
        "Add note to chat": {
            check: async function (app, noteUUID) {
                return await plugin.isEmbedOpen(app);
            },
            run: async function (app, noteUUID) {
                const note = await app.findNote({uuid: noteUUID});
                const noteContent = await app.getNoteContent({uuid: noteUUID});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'note', noteUUID: noteUUID, noteTitle: note.name, noteContent: noteContent});
            }
        },
        "Related notes": async function (app, noteUUID) {
            try {
                plugin.sendMessageToEmbed(app, 'searchForTextInSearchInterface', `<<Related: ${noteUUID}>>`);
                await app.openSidebarEmbed(1, {trigger: 'appOption', openSearch: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        }
    },
    taskOption: {
        "Chat with task": {
            check: async function (app, taskObj) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app, taskObj) {
                await app.openSidebarEmbed(1, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'task', taskUUID: taskObj.uuid});
            }
        },
        "Add task to chat": {
            check: async function (app, taskObj) {
                return await plugin.isEmbedOpen(app);
            },
            run: async function (app, taskObj) {
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'task', taskUUID: taskObj.uuid, taskContent: taskObj.content,
                        taskStartAt: taskObj.startAt, taskEndAt: taskObj.endAt,
                        completedAt: taskObj.completedAt, dismissedAt: taskObj.dismissedAt,
                        hideUntil: taskObj.hideUntil, taskScore: taskObj.score,
                        important: taskObj.important, urgent: taskObj.urgent});
            }
        }
    },
    imageOption: {
        "Chat with image": {
            check: async function (app, image) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app, image) {
                await app.openSidebarEmbed(1, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'image', src: image.src});
            }
        },
        "Add image to chat": {
            check: async function (app, image) {
                return await plugin.isEmbedOpen(app);
            },
            run: async function (app, image) {
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'image', src: image.src});
            }
        }
    },
    renderEmbed: async function (app, args, source = 'embed') {
        if (args.openChat) {
            return chatHTML;
        } else if (args.openSearch) {
            return searchHTML;
        }
    },
    sendMessageToEmbed: async function (app, channel, message) {
        if (!window.messageQueue) {
            window.messageQueue = {};
        }
        window.messageQueue[channel] = window.messageQueue[channel] || [];
        window.messageQueue[channel].push(message);
    },
    isEmbedOpen: async function (app) {
        // For this to work, the embed must send heartbeat signals to the plugin
        return window.lastHeartbeatFromChatEmbed
            && window.lastHeartbeatFromChatEmbed > Date.now() - 600;
    },
    onEmbedCall : createOnEmbedCallHandler({
        ...COMMON_EMBED_COMMANDS,
        "ping": async function (app) {
          window.lastHeartbeatFromChatEmbed = Date.now();
          return true;
        },
        "receiveMessageFromPlugin": async function (app, channel) {
            if (window.messageQueue && window.messageQueue[channel] &&
                window.messageQueue[channel].length > 0) {
                return window.messageQueue[channel].shift();
            }
            return null;
        },
        "getUserCurrentNoteData": async (app) => {
            try {
                let currentNoteUUID = app.context.noteUUID;
                if (!currentNoteUUID) {
                    const currentURL = app.context.url;
                    const regex = /amplenote\.com\/notes\/([a-f0-9-]+)/;
                    const matches = currentURL.match(regex);
                    if (matches && matches.length > 1) {
                        currentNoteUUID = matches[1];
                    }
                }
                if (!currentNoteUUID) return {currentNoteUUID: null};
                const currentNote = await app.findNote({uuid: currentNoteUUID});
                if (!currentNote) return {currentNoteUUID: null};
                return {currentNoteUUID: currentNote.uuid, currentNoteName: currentNote.name}
            } catch (e) {
                throw 'Failed getUserCurrentNoteData - ' + e;
            }
        },
        "getUserDailyJotNote": async function (app) {
            try {
                const dailyJotNote = await app.notes.dailyJot(Math.floor(Date.now() / 1000));
                const dailyJotNoteUUID = (await dailyJotNote.url()).split('/').pop();
                return {
                    dailyJotNoteUUID: dailyJotNoteUUID,
                    dailyJotNoteName: dailyJotNote.name
                }
            } catch (e) {
                throw 'Failed getUserDailyJotNote - ' + e;
            }
        },
        "getLocalVecDBSyncState": async function (app) {
            return await new LocalVecDB().getSyncState(app);
        },
        "syncNotesWithLocalVecDB": async function (app) {
            await new LocalVecDB().syncNotes(app, plugin.sendMessageToEmbed);
        },
        "searchNotesInLocalVecDB": async function (app, queryText, opts) {
            return await new LocalVecDB().searchNotes(app, queryText, opts);
        },
        "searchHelpCenter": async function (app, queryText, opts) {
            await new LocalVecDB().loadHelpCenterEmbeddings(app);
            return await new LocalVecDB().searchHelpCenter(app, queryText, opts);
        },
        "getMatchedPartWithFuzzySearch": async function (app, noteUUID, searchText, limit) {
            return await getMatchedPartWithFuzzySearch(app, noteUUID, searchText, limit);
        }
    }, ['getUserCurrentNoteData', 'getUserDailyJotNote',
        'receiveMessageFromPlugin', 'ping'])
}

export default plugin;
