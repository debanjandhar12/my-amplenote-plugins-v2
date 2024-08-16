import { Markmap, loadCSS, loadJS } from '@debanjandhar12/markmap-view';
import {parseMarkdownAsMindMap} from "./parser/parser.js";
import {createToolbar} from "./toolbar/toolbar-main.js";
import {
    INITIAL_EXPAND_LEVEL_SETTING,
    INITIAL_EXPAND_LEVEL_SETTING_DEFAULT,
    TITLE_AS_DEFAULT_NODE_SETTING
} from "../constants.js";
import {addTitleToRootNode, removeEmptyChildrenFromRoot} from "./parser/parser-result-processor.js";

export async function initMarkMap() {
    const options = {
        autoFit: false,
        duration: 400,
        initialExpandLevel: window.appSettings[INITIAL_EXPAND_LEVEL_SETTING] &&
            !isNaN(window.appSettings[INITIAL_EXPAND_LEVEL_SETTING]) ?
            parseInt(window.appSettings[INITIAL_EXPAND_LEVEL_SETTING]) : parseInt(INITIAL_EXPAND_LEVEL_SETTING_DEFAULT),
    }
    try {
        const svgEl = document.querySelector('#markmap-svg');
        const { root, assets } = await fetchMarkdownOfWindowNoteAndParse();
        const markmap = Markmap.create(svgEl, options, root);
        if(assets.styles) loadCSS(assets.styles);
        if(assets.scripts) loadJS(assets.scripts);
        createToolbar(markmap, svgEl);
        addAditionalStyleForMarkMap();
    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">${error.message}</div>`;
        throw error;
    }
}

export async function reloadMarkMap(markmap) {
    try {
        const { root, assets } = await fetchMarkdownOfWindowNoteAndParse();
        markmap.setData(root);
    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">${error.message}</div>`;
        throw error;
    }
}

async function fetchMarkdownOfWindowNoteAndParse() {
    const markdown = await window.callAmplenotePlugin('getNoteContent', window.noteUUID);
    let { root,  assets } = parseMarkdownAsMindMap(markdown);
    if (window.appSettings[TITLE_AS_DEFAULT_NODE_SETTING] === 'true' ||
        root.content === '') {
        root = addTitleToRootNode(root,
            await window.callAmplenotePlugin('getNoteTitle', window.noteUUID));
    }
    root = removeEmptyChildrenFromRoot(root);
    return { root, assets };
}

function addAditionalStyleForMarkMap() {
    const style = document.createElement('style');
    style.textContent = `
    #markmap-svg.markmap {
      --markmap-text-color: rgb(249, 251, 252);
      --markmap-table-border: 1px solid #626d7a;
    }
    #markmap-svg.markmap blockquote {
      margin: 0;
      font-style: oblique;
    }
    body {
        background-color: #192025;
        color: rgb(249, 251, 252);
    }
    `;
    document.head.append(style);
}