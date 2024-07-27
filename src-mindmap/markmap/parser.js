import { Transformer } from '@debanjandhar12/markmap-lib/no-plugins';
import {pluginCheckbox, pluginHljs, pluginSourceLines} from "@debanjandhar12/markmap-lib/plugins";
import {amplenoteLinksPlugin} from "./parser-plugins.js";
import {selectorRules} from "./parser-rules.js";


export function parseMarkdownAsMindMap(markdown) {
    const transformer = new Transformer([pluginCheckbox, pluginHljs, pluginSourceLines, amplenoteLinksPlugin]);
    const transformResult = transformer.transform(markdown, {selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li,table,pre,p,img',
        selectorRules,
        lossless: true
    });
    return {
        ...transformResult,
        assets: transformResult.features ? transformer.getUsedAssets(transformResult.features) : []
    }
}

function addTitleToRootNode(root, title) {
    if (root.content == "") root.content = title;
    else root = { content: title, children: [root], type: 'heading', depth: 0 }
}