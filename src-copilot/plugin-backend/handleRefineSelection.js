import {generateText} from "../aisdk-wrappers/generateText.js";
import {getLLMModel} from "../aisdk-wrappers/getLLMModel.js";

export async function handleRefineSelection(app, selectionContent) {
    let promptPrefix = await app.prompt("", {
        inputs: [
            { label: "Enter prompt type:", type: "select", options: [
                    { icon: "summarize", label: "Rephrase", value: "Rephrase the following selected text:" },
                    { icon: "unfold_more", label: "Shorten", value: "Shorten the following selected text:" },
                    { icon: "unfold_less", label: "Elaborate", value: "Elaborate the following selected text:" },
                    { icon: "work", label: "More formal", value: "Make the following selected text more formal:" },
                    { icon: "beach_access", label: "More casual", value: "Make the following selected text more casual:" },
                    { icon: "healing", label: "Fix grammar", value: "Rectify grammar and spelling in the following selected text:" },
                    { icon: "edit", label: "Custom", value: "Custom" }
                ], value: "Rephrase the following selected text:" }
        ]
    });
    if (!promptPrefix) return;
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
            await app.replaceNoteContent({uuid: app.context.noteUUID}, response.text);
        }
    } else {
        throw new Error('LLM response is empty');
    }
}
