import { Toolbar } from '@debanjandhar12/markmap-toolbar';
import {reloadMarkMap} from "../renderer.js";
import {collapseAllNodes, expandAllNodes} from "./expandColapseNode.js";
import {downloadScreenshot} from "./screenshot.js";

export function createToolbar(markmap) {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
    .mm-toolbar-brand {
    display: none;
    }
    .mm-toolbar-item[title="Toggle recursively"] {
        display: none;
    }
    .mm-toolbar-item {
        color: rgb(133, 147, 163);
    }
    .mm-toolbar-item:hover {
        cursor: pointer;
        color: #007bff;
    }
    .mm-toolbar-item svg {
        pointer-events: none;
    }
    `;
    document.head.append(style);

    // Create toolbar
    const { el } = Toolbar.create(markmap);
    el.style.position = 'absolute';
    el.style.top = '0.5rem';
    el.style.right = '0.5rem';

    // Add new toolbar item for reloading the mind map
    const toolbarBrand = el.querySelector('.mm-toolbar-brand');
    const reloadToolbarItem = document.createElement('div');
    reloadToolbarItem.className = 'mm-toolbar-item';
    reloadToolbarItem.title = 'Reload Mind Map';
    reloadToolbarItem.onclick = () => reloadMarkMap(markmap);
    reloadToolbarItem.innerHTML = '<svg width="20" height="20" viewBox="0 0 768 1204"><path fill="currentColor" d="M655.461 473.469c11.875 81.719-13.062 167.781-76.812 230.594-94.188 92.938-239.5 104.375-346.375 34.562l74.875-73L31.96 627.25 70.367 896l84.031-80.5c150.907 111.25 364.938 100.75 502.063-34.562 79.5-78.438 115.75-182.562 111.25-285.312L655.461 473.469zM189.46 320.062c94.156-92.938 239.438-104.438 346.313-34.562l-75 72.969 275.188 38.406L697.586 128l-83.938 80.688C462.711 97.34400000000005 248.742 107.96900000000005 111.585 243.25 32.085 321.656-4.133 425.781 0.335 528.5l112.25 22.125C100.71 468.875 125.71 382.906 189.46 320.062z"/></svg>';
    toolbarBrand.insertAdjacentElement('afterend', reloadToolbarItem);

    // Add new toolbar item for additional option selection
    const lastToolbarItem = el.querySelector('.mm-toolbar-item:last-child');
    const additionalOptionSelectionToolbarItem = document.createElement('div');
    additionalOptionSelectionToolbarItem.className = 'mm-toolbar-item';
    additionalOptionSelectionToolbarItem.title = 'Additional Options';
    additionalOptionSelectionToolbarItem.onclick = () => handleAdditionalOptionSelection(markmap);
    additionalOptionSelectionToolbarItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="-2 -4 28 28" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
    lastToolbarItem.insertAdjacentElement('afterend', additionalOptionSelectionToolbarItem);

    // Append the toolbar
    document.body.append(el);
}

async function handleAdditionalOptionSelection(markmap) {
    const selection = await window.callAmplenotePlugin('getAdditionalOptionSelection');
    switch (selection) {
        case 'Expand all nodes recursively':
            expandAllNodes(markmap);
            break;
        case 'Collapse all nodes recursively':
            collapseAllNodes(markmap);
            break;
        case 'Save as png image':
                await downloadScreenshot(markmap);
            break;
    }
}