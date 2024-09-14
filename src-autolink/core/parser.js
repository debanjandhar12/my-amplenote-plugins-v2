import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import remarkParse from 'remark-parse'; // Fails to import with dynamicImportESM

export async function parse(markdownText) {
    const remarkGfm = await dynamicImportESM("remark-gfm").default;
    const {unified} = await dynamicImportESM("unified");
    return await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(markdownText);
}