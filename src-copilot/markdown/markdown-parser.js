import {dynamicImportExternalPluginBundle} from "../../common-utils/dynamic-import-esm.js";

let remarkGfm, unified, remarkFrontmatter, remarkParse;
export async function parse(markdownText) {
    if (!remarkGfm || !unified || !remarkFrontmatter || !remarkParse) {
        [remarkGfm, unified, remarkFrontmatter, remarkParse] = await dynamicImportExternalPluginBundle('remarkBundle.js');
        unified = unified.unified;
        remarkGfm = remarkGfm.default;
        remarkFrontmatter = remarkFrontmatter.default;
        remarkParse = remarkParse.default;
    }

    return await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFrontmatter, ['yaml'])
        .parse(markdownText);
}