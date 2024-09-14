import {amplenoteBackslashBreakPlugin, amplenoteLinksPlugin, headerAnchorPlugin} from "./parser-plugins.js";
import {selectorRules} from "./parser-rules.js";
import {SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING} from "../../constants.js";
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";


export async function parseMarkdownAsMindMap(markdown, selector) {
    const { Transformer } = await dynamicImportESM('@debanjandhar12/markmap-lib/no-plugins');
    const { pluginCheckbox, pluginHljs, pluginSourceLines } = await dynamicImportESM('@debanjandhar12/markmap-lib/plugins');
    const transformer = new Transformer([pluginCheckbox, pluginHljs, pluginSourceLines, amplenoteLinksPlugin, amplenoteBackslashBreakPlugin, headerAnchorPlugin]);
    const transformResult = transformer.transform(markdown, {selector,
        selectorRules,
        lossless: appSettings[SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING] === 'false'
    });
    return {
        ...transformResult,
        assets: transformResult.features ? transformer.getUsedAssets(transformResult.features) : []
    }
}