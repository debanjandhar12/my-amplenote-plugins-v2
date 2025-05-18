import {generateText} from "../aisdk-wrappers/generateText.js";
import {getLLMModel} from "../aisdk-wrappers/getLLMModel.js";

export async function handleContinue(app) {
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
    else {
        await app.context.replaceSelection('');
        throw new Error('LLM response is empty');
    }
}
