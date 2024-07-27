import { Markmap, loadCSS, loadJS } from '@debanjandhar12/markmap-view';
import {parseMarkdownAsMindMap} from "./parser.js";
import {createToolbar} from "./toolbar.js";

export async function initMarkMap(markdown) {
    const svgEl = document.querySelector('#markmap-svg');
    const options = {
        autoFit: false,
        duration: 10
        // TODO: add more from settings?
    }
    try {
        const { root,  assets } = parseMarkdownAsMindMap(markdown);
        console.log(assets);
        markdown = `---
title: ${await window.callAmplenotePlugin('getNoteTitle', noteUUID)}
---
${markdown}
`;
        const markmap = Markmap.create(svgEl, options, root);
        if(assets.styles) loadCSS(assets.styles);
        if(assets.scripts) loadJS(assets.scripts);
        createToolbar(markmap, svgEl);
        addAditionalStyleForMarkMap();
    } catch (error) {
        console.error(error);
    }
}

function addAditionalStyleForMarkMap() {
    const style = document.createElement('style');
    style.textContent = `
    #markmap-svg.markmap {
      --markmap-text-color: rgb(249, 251, 252);
      --markmap-table-border: 1px solid #626d7a;
    }
    body {
        background-color: #192025;
        color: rgb(249, 251, 252);
    }
    `;
    document.head.append(style);
}

const initialHTML = document.body.outerHTML;
export function reloadMarkMap() {
    document.body.outerHTML = 'Reloading...';
    function setInnerHTMLAndExecuteScripts(element, html) {
        const newContent = document.createRange().createContextualFragment(html);
        element.innerHTML = '';
        element.append(newContent);
    }
    setInnerHTMLAndExecuteScripts(document.body, initialHTML);
}