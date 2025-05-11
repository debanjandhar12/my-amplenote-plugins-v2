import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export async function generateImage(model, prompt, size = 512) {
    const { experimental_generateImage } = await dynamicImportESM("ai");
    return await experimental_generateImage({
        model: model,
        prompt,
        n: 1,
        size: `${size}x${size}`
    });
}