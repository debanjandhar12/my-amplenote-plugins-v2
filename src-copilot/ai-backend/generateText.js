import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export async function generateText(model, prompt) {
    const { generateText } = await dynamicImportESM("@ai-sdk/react");
    return await generateText({
        model: model,
        prompt
    });
}