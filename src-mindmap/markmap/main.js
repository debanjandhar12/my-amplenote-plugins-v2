import {Markmap} from "@debanjandhar12/markmap-view";
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
        const { root, features } = parseMarkdownAsMindMap(markdown);
        markdown = `---
title: ${await window.callAmplenotePlugin('getNoteTitle', noteUUID)}
---
${markdown}
`;
        console.log('Root', root, features);
        console.log('Rendering', markdown, root, features);
        const markmap = Markmap.create(svgEl, options, root);
        createToolbar(markmap, svgEl);
        addStyleForMarkMap();
    } catch (error) {
        console.error(error);
    }
}

function addStyleForMarkMap() {
    const style = document.createElement('style');
    style.textContent = `
    #markmap-svg.markmap {
      --markmap-text-color: rgb(249, 251, 252);
    }
    body {
        background-color: #192025;
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