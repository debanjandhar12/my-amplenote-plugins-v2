import {generateText} from "../aisdk-wrappers/generateText.js";
import {getLLMModel} from "../aisdk-wrappers/getLLMModel.js";
import {USER_PROMPT_LIST_SETTING} from "../constants.js";
import {truncate} from "lodash-es";

export async function handleRefineSelection(app, selectionContent) {
    let savedPromptList = [];
    try {
        (JSON.parse(app.settings[USER_PROMPT_LIST_SETTING])).sort((a, b) => b.usageCount - a.usageCount).forEach((prompt, index) =>
            savedPromptList.push({ icon: "auto_fix_high", label: truncate(prompt.message, {length: 96}), fullLabel: prompt.message, value: "SavedCustomPrompt" + index }));
    } catch (e) {}
    let promptPrefix = await app.prompt("", {
        inputs: [
            { label: "Enter prompt type:", type: "select", options: [
                    { icon: "summarize", label: "Rephrase", value: "Rephrase the following selected text:" },
                    { icon: "unfold_more", label: "Shorten", value: "Shorten the following selected text:" },
                    { icon: "unfold_less", label: "Elaborate", value: "Elaborate the following selected text:" },
                    { icon: "work", label: "More formal", value: "Make the following selected text more formal:" },
                    { icon: "beach_access", label: "More casual", value: "Make the following selected text more casual:" },
                    { icon: "healing", label: "Fix grammar", value: "Rectify grammar and spelling in the following selected text:" },
                    ...savedPromptList,
                    { icon: "edit", label: "Custom", value: "Custom" }
                ], value: "Rephrase the following selected text:" }
        ]
    });
    if (!promptPrefix) return;
    if (promptPrefix.startsWith("SavedCustomPrompt")) {
        promptPrefix = savedPromptList[parseInt(promptPrefix.substring("SavedCustomPrompt".length))].fullLabel;
        promptPrefix = "Follow instructions bellow to edit text:\n" + promptPrefix;
        promptPrefix += "\nSelected text";
    }
    if (promptPrefix === "Custom") {
        promptPrefix = await app.prompt("Enter custom prompt:");
        promptPrefix += "\nSelected text";
        if (!promptPrefix) return;
    }
    const prompt = `Only respond with the text that should replace the selection. Do not reply anything other than the edited text.
    ${promptPrefix}:\n` + selectionContent;
    const response = await generateText(await getLLMModel(app.settings), prompt);
    if (response.text) {
        const shouldReplace = await app.alert(response.text, {
            preface: "Copilot response:",
            actions: [
                { label: "Replace", value: "replace", icon: "edit" },
            ]
        });
        if (shouldReplace === "replace") {
            await app.context.replaceSelection(response.text);
        }
    } else {
        throw new Error('LLM response is empty');
    }
}
