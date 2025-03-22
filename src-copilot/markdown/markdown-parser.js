import {dynamicImportExternalPluginBundle} from "../../common-utils/dynamic-import-esm.js";

let remarkGfm, unified, remarkFrontmatter, remarkParse, pipe, pipeWithYaml;
export async function parse(markdownText, {yaml = false} = {}) {
    if (!remarkGfm || !unified || !remarkFrontmatter || !remarkParse) {
        [remarkGfm, unified, remarkFrontmatter, remarkParse] = await dynamicImportExternalPluginBundle('remarkBundle.js');
        unified = unified.unified;
        remarkGfm = remarkGfm.default;
        remarkFrontmatter = remarkFrontmatter.default;
        remarkParse = remarkParse.default;
    }

    if (!pipe && !yaml) {
        pipe = unified()
            .use(remarkParse)
            .use(remarkGfm);
    }

    if (!pipeWithYaml && yaml) {
        pipeWithYaml = unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkFrontmatter, ['yaml']);
    }

    return await (yaml ? pipeWithYaml : pipe).parse(markdownText);
}