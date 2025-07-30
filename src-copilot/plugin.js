import chatHTML from 'inline:./embed/chat.html';
import searchHTML from 'inline:./embed/search.html';
// import speechtotextHTML from 'inline:./embed/speechtotext.html';
import {COMMON_EMBED_COMMANDS, createOnEmbedCallHandler} from "../common-utils/embed-comunication.js";
import {generateText} from "./aisdk-wrappers/generateText.js";
import {getLLMModel} from "./aisdk-wrappers/getLLMModel.js";
import {getSyncState, syncNotes, searchNotes, searchHelpCenter, clearCopilotDBData, getAllChatThreads, deleteChatThread, getChatThread, saveChatThread, getLastUpdatedChatThread, getLastOpenedChatThread, searchUserTasks} from "./CopilotDB";
import {getMatchedPartWithFuzzySearch} from "./plugin-backend/getMatchedPartWithFuzzySearch.jsx";
import {validatePluginSettings} from "./validatePluginSettings.js";
// import {handleSpeechToText} from "./plugin-backend/handleSpeechToText.js";
import {handleContinue} from "./plugin-backend/handleContinue.js";
import {handleRefineSelection} from "./plugin-backend/handleRefineSelection.js";
import {handleImageGeneration, checkImageGenerationAvailability} from "./plugin-backend/handleImageGeneration.js";

const plugin = {
    currentNoteUUID: null,
    validateSettings: async function (app) {
        try {
            return await validatePluginSettings(app);
        } catch (e) {
            console.error(e);
        }
    },
    insertText: {
        "Continue": async function (app) {
            try {
                await handleContinue(app);
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Speech to Text": async function (app) {
            try {
                // await handleSpeechToText(app, plugin);
                await app.alert('Speech to Text is under development.');
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
                return await checkImageGenerationAvailability(app);
            },
            run: async function (app) {
                try {
                    await handleImageGeneration(app);
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
                await plugin.openEmbedStrategy(app, {trigger: 'appOption', openSearch: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Sync notes with CopilotDB": async function (app) {
            try {
                await plugin.sendMessageToEmbed(app, 'startSyncToCopilotDBInSearchInterface', true);
                await plugin.openEmbedStrategy(app, {trigger: 'appOption', openSearch: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Chat with Copilot": async function (app) {
            try {
                await plugin.openEmbedStrategy(app, {trigger: 'appOption', openChat: true});
            } catch (e) {
                console.error(e);
                await app.alert(e);
            }
        },
        "Clear CopilotDB opfs data": async function (app) {
            try {
                const confirmed = await app.prompt(
                    "This will permanently delete all CopilotDB data stored in your browser. You will need to sync your notes again to use the search features of this plugin. This will also delete your chat history.\nAre you sure you want to continue?",
                    {
                        inputs: []
                    }
                );

                if (!confirmed) {
                    return;
                }

                const result = await clearCopilotDBData(app);
                await app.alert(`${result.message}`);
            } catch (e) {
                console.error(e);
                await app.alert(`Error clearing CopilotDB data: ${e.message || e}`);
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
                await plugin.openEmbedStrategy(app, {openChat: true});
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
        "Refine selection": async function (app, selectionContent) {
            try {
                await handleRefineSelection(app, selectionContent);
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
                await plugin.openEmbedStrategy(app, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'new-chat', message: []});
            }
        },
        "Chat with note": {
            check: async function (app, noteUUID) {
                return !(await plugin.isEmbedOpen(app));
            },
            run: async function (app, noteUUID) {
                await plugin.openEmbedStrategy(app, {openChat: true});
                const note = await app.findNote({uuid: noteUUID});
                const noteContent = await app.getNoteContent({uuid: noteUUID});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'new-chat', message: []});
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
                await plugin.openEmbedStrategy(app, {trigger: 'appOption', openSearch: true});
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
                await plugin.openEmbedStrategy(app, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'new-chat', message: []});
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
                await plugin.openEmbedStrategy(app, {openChat: true});
                await plugin.sendMessageToEmbed(app, 'attachments',
                    {type: 'new-chat', message: []});
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
    openEmbedStrategy: async function (app, ...args) {
        // Open in sidebar first
        const isOpenedInSidebar = await app.openSidebarEmbed(1, 'sidebar', ...args);
        try {
            app.context.updateEmbedArgs({}); // clear drawer just in case to prevent multiple instance (does not work)
        } catch (e) {console.log(e)}
        if (isOpenedInSidebar) return;

        // Open in drawer since sidebar failed
        await app.openEmbed('drawer', ...args);   // openEmbed returns null always so no check for isOpenedInDrawer
        if (app.context.pluginUUID) {
            await app.navigate("https://www.amplenote.com/notes/plugins/" + app.context.pluginUUID);
        }
        try {
            await app.openSidebarEmbed(1, 'sidebar', {}); // clear sidebar just in case to prevent multiple instance
        } catch (e) {}
    },
    renderEmbed: async function (app, source, args) {
        if (args.openChat) {
            return chatHTML;
        } else if (args.openSearch) {
            return searchHTML;
        } else if (args.openSpeechToText) {
            return speechtotextHTML;
        }
        return null;
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
        // Embeds need to send heartbeat signals to the plugin. Used in isEmbedOpen
        "ping": async function (app) {
            window.lastHeartbeatFromChatEmbed = Date.now();
            return true;
        },
        // This doesn't actually close the embed, it just sets isEmbedOpen to false
        "forceEmbedClose": async function (app) {
            window.lastHeartbeatFromChatEmbed = null;
            return true;
        },
        "receiveMessageFromPlugin": async function (app, channel) {
            if (window.messageQueue && window.messageQueue[channel] &&
                window.messageQueue[channel].length > 0) {
                return window.messageQueue[channel].shift();
            }
            return null;
        },
        "sendMessageToEmbed": async function (app, channel, message) {
            console.log('Sending message to embed:', message);
            await plugin.sendMessageToEmbed(app, channel, message);
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
        "getCopilotDBSyncState": async function (app) {
            return await getSyncState(app);
        },
        "syncNotesWithCopilotDB": async function (app) {
            await syncNotes(app, plugin.sendMessageToEmbed);
        },
        "searchNotesInCopilotDB": async function (app, queryText, queryTextType, opts) {
            return await searchNotes(app, queryText, queryTextType, opts);
        },
        "searchHelpCenter": async function (app, queryText, opts) {
            return await searchHelpCenter(app, queryText, opts);
        },
        "getMatchedPartWithFuzzySearch": async function (app, noteUUID, searchText, limit) {
            return await getMatchedPartWithFuzzySearch(app, noteUUID, searchText, limit);
        },
        "getAllChatThreadsFromCopilotDB": async function (app) {
            return await getAllChatThreads();
        },
        "deleteChatThreadFromCopilotDB": async function (app, threadId) {
            return await deleteChatThread(threadId);
        },
        "getChatThreadFromCopilotDB": async function (app, threadId) {
            return await getChatThread(threadId);
        },
        "saveChatThreadToCopilotDB": async function (app, thread) {
            return await saveChatThread(thread);
        },
        "getLastUpdatedChatThreadFromCopilotDB": async function (app) {
            return await getLastUpdatedChatThread();
        },
        "getLastOpenedChatThreadFromCopilotDB": async function (app) {
            return await getLastOpenedChatThread();
        },
        "searchUserTasks": async function (app, sqlQuery) {
            return await searchUserTasks(app, sqlQuery);
        }
    }, ['getUserCurrentNoteData', 'getUserDailyJotNote',
        'getAllChatThreadsFromCopilotDB', 'saveChatThreadToCopilotDB', 'getChatThreadFromCopilotDB',
        'getLastOpenedChatThreadFromCopilotDB',
        'receiveMessageFromPlugin', 'ping'])
}

export default plugin;
