import { Toolbar } from '@debanjandhar12/markmap-toolbar';
import {reloadMarkMap} from "./main.js";

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

    // Add new toolbar item
    const toolbarBrand = el.querySelector('.mm-toolbar-brand');
    const toolbarItem = document.createElement('div');
    toolbarItem.className = 'mm-toolbar-item';
    toolbarItem.title = 'Reload Mind Map';
    toolbarItem.onclick = () => reloadMarkMap();
    toolbarItem.innerHTML = '<svg width="20" height="20" viewBox="0 0 768 1204"><path fill="currentColor" d="M655.461 473.469c11.875 81.719-13.062 167.781-76.812 230.594-94.188 92.938-239.5 104.375-346.375 34.562l74.875-73L31.96 627.25 70.367 896l84.031-80.5c150.907 111.25 364.938 100.75 502.063-34.562 79.5-78.438 115.75-182.562 111.25-285.312L655.461 473.469zM189.46 320.062c94.156-92.938 239.438-104.438 346.313-34.562l-75 72.969 275.188 38.406L697.586 128l-83.938 80.688C462.711 97.34400000000005 248.742 107.96900000000005 111.585 243.25 32.085 321.656-4.133 425.781 0.335 528.5l112.25 22.125C100.71 468.875 125.71 382.906 189.46 320.062z"/></svg>';
    toolbarBrand.insertAdjacentElement('afterend', toolbarItem);

    // Append the toolbar
    document.body.append(el);
}