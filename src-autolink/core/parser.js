import {dynamicImportExternalPluginBundle} from "../../common-utils/dynamic-import-esm.js";

let remarkGfm, unified, remarkParse, pipe;
export async function parse(markdownText) {
    if (!remarkGfm || !unified || !remarkParse) {
        [remarkGfm, unified, , remarkParse] = await dynamicImportExternalPluginBundle('remarkBundle.js');
        unified = unified.unified;
        remarkGfm = remarkGfm.default;
        remarkParse = remarkParse.default;
    }

    if (!pipe) {
        pipe = unified()
            .use(remarkParse)
            .use(remarkGfm);
    }

    return await pipe.parse(markdownText);
}