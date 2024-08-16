import d3SvgToPng from "d3-svg-to-png";
import _ from "lodash";

export async function downloadScreenshot(markmap) {
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