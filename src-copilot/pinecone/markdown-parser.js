import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import remarkParse from 'remark-parse'; // Fails to import with dynamicImportESM

let remarkGfm, unified;
export async function parse(markdownText) {
    if (!remarkGfm) {
        remarkGfm = (await dynamicImportESM("remark-gfm")).default;
    }
    if (!unified) {
        unified = (await dynamicImportESM("unified")).unified;
    }
    return await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(markdownText);
}