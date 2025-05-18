import {getImageModel} from "../aisdk-wrappers/getImageModel.js";
import {generateImage} from "../aisdk-wrappers/generateImage.js";
import {LLM_API_URL_SETTING} from "../constants.js";

export async function checkImageGenerationAvailability(app) {
    try {
        if (app.settings[LLM_API_URL_SETTING].trim() !== '') {
            const imageModel = await getImageModel(app.settings);
            return !!imageModel;
        }
    } catch (e) { 
        console.error(e); 
    }
    return false;
}

export async function handleImageGeneration(app) {
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

    if (!prompt) return;

    const response = await generateImage(imageModel, prompt, size);
    console.log('response', response);
    if (response.image) {
        const imgUrl = await app.attachNoteMedia({uuid: app.context.noteUUID}, 'data:image/webp;base64,' + response.image.base64);
        await app.context.replaceSelection(`![](${imgUrl})`);
    }
    else {
        throw new Error('LLM response is empty');
    }
}
