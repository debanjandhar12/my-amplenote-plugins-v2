import { Transformer } from '@debanjandhar12/markmap-lib/no-plugins';
import {pluginCheckbox, pluginHljs, pluginSourceLines} from "@debanjandhar12/markmap-lib/plugins";
import {amplenoteBackslashBreakPlugin, amplenoteLinksPlugin} from "./parser-plugins.js";
import {selectorRules} from "./parser-rules.js";
import {SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING} from "../../constants.js";


export function parseMarkdownAsMindMap(markdown, selector) {
    const transformer = new Transformer([pluginCheckbox, pluginHljs, pluginSourceLines, amplenoteLinksPlugin, amplenoteBackslashBreakPlugin]);
    const transformResult = transformer.transform(markdown, {selector,
        selectorRules,
        lossless: appSettings[SHOW_ONLY_SIBLINGS_AT_CURRENT_LEVEL_SETTING] === 'false'
    });
    return {
        ...transformResult,
        assets: transformResult.features ? transformer.getUsedAssets(transformResult.features) : []
    }
}