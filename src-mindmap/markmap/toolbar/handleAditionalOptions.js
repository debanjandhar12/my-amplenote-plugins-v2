import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

export async function handleAdditionalOptions(markmap) {
    const selection = await window.app.prompt("", {
        inputs: [
            { label: "Select an option", type: "select", options: [
                    { label: "Expand all nodes recursively", value: "Expand all nodes recursively" },
                    { label: "Collapse all nodes recursively", value: "Collapse all nodes recursively" },
                    { label: "Save as png image", value: "Save as png image" }
                ], value: "Expand all nodes recursively"
            }
        ]
    });
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

function expandAllNodes(markmap) {
    const { data } = markmap.state;

    function expand(node) {
        if (node.children) {
            node.payload = { ...node.payload, fold: 0 };
            node.children.forEach(expand);
        }
    }

    expand(data);
    markmap.setData(data);
}

function collapseAllNodes(markmap) {
    const { data } = markmap.state;

    function collapse(node) {
        if (node.children) {
            node.payload = { ...node.payload, fold: 1 };
            node.children.forEach(collapse);
        }
    }

    collapse(data);
    markmap.setData(data);
}

async function downloadScreenshot(markmap) {
    const d3SvgToPng = (await dynamicImportESM("d3-svg-to-png")).default;
    const svg = markmap.svg.node();
    await markmap.fit();
    const png = await d3SvgToPng(svg, "markmap.png", {
        scale: 2 / svg.__zoom.k,
        format: "png",
        download: false,
        background: '#192025',
        quality: 1
    });
    const noteName = await window.callAmplenotePlugin('getNoteTitle', window.noteUUID) || 'mindmap';

    await window.callAmplenotePlugin('saveFile', {
        name: `${noteName}.png`,
        data: png
    });
}