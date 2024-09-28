import { Buffer } from 'buffer';

const plugin = {
    replaceText: {
        "Convert to Dia": async function (app, text) {
            text = text.trim();
            let {type, text: parsedText} = await plugin._parseUserIntentFromText(app, text);
            if(type === 'cancel') return;
            await plugin._toDiagram(app, type, text, parsedText)
            return null;
        }
    },
    insertText: {
        "Create Diagram": async function (app) {
            let {type, text} = await plugin._parseUserIntentFromText(app, null);
            if(type === 'cancel') return;
            text = text.trim();
            await plugin._toDiagram(app, type, text, text)
            return null;
        }
    },
    imageOption: {
        "Convert to Text": async function (app, image) {
            await plugin._toText(app, image);
            return null;
        }
    },
    async _parseUserIntentFromText(app, text) {
        if (typeof text == "string" && text.match(/^\$\$(.*?)\$\$$/s)) {
            return {type: 'tex-display', text: text.replace(/^\$\$(.*?)\$\$$/s, '$1')};
        }
        else if (typeof text == "string" && text.match(/^\$(.*?)\$$/s)) {
            return {type: 'tex', text: text.replace(/^\$(.*?)\$$/s, '$1')};
        }
        const promptInputs = [
            {
                label: "Diagram Type", type: "select", options: [
                    {label: "Tex (Inline)", value: 'tex'},
                    {label: "Tex (Display)", value: 'tex-display'},
                    {label: "Mermaid", value: 'mermaid'},
                    {label: "PlantUML", value: 'plantuml'},
                    {label: "Graphviz", value: 'graphviz'},
                    {label: "Ditaa", value: 'ditaa'},
                    {label: "DBML", value: 'dbml'},
                ]
                , value: 'ditaa'
            },
        ];
        let type;
        if (text == null) {
            const arr = await app.prompt("Options for creating image:", {
                inputs: [{ label: "Text / Code", placeholder: "+--+\n|A |\n+--+", type: "text" }, ...promptInputs]
            });
            if(!arr) return {type: 'cancel'};
            text = arr[0];
            if(!text || text === '') return {type: 'cancel'};
            type = arr[1];
        }
        else {
            type = await app.prompt("Options for creating image:", {
                inputs: promptInputs
            });
            if(!type) return {type: 'cancel'};
        }

        return {type, text};
    },
    async _toDiagram(app, type, text, parsedText) {
        try {
            console.log(text);
            let response;
            if (type == null) return;
            else if (type === 'tex' || type === 'tex-display') {
                // https://www.overleaf.com/learn/latex/Font_sizes%2C_families%2C_and_styles
                // https://www.overleaf.com/learn/latex/Using_colours_in_LaTeX
                response = await fetch(`https://kroki.io/tikz/svg`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `\\documentclass{article}
                            \\usepackage{amsmath}
                            \\usepackage[dvipsnames]{xcolor}
                            \\usepackage[active,tightpage]{preview}
                            \\PreviewEnvironment{equation*}
                            \\setlength\\PreviewBorder{0.125pt}
                            
                            \\begin{document}
                            \\${type === 'tex-display' ? 'huge' : 'large'}
                            \\begin{equation*}
                            {${type === 'tex-display' ? '\\displaystyle' : ''} \\color{Emerald} ${parsedText}}
                            \\end{equation*}
                            \\end{document}`
                });
            } else if (type === 'mermaid' || type === 'plantuml' || type === 'graphviz' || type === 'ditaa' || type === 'dbml') {
                response = await fetch(`https://kroki.io/${type}/svg`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: parsedText
                });
            }
            if (!response)
                throw new Error('No response from kroki.io');
            if (!response.ok) {
                let error = await response.text();
                throw new Error(error);
            }
            const blob = await response.blob();
            const svgDataURL = await plugin._dataURLFromBlob(blob);
            const pngDataURL = await plugin._svgToPng(svgDataURL);
            const noteHandle = {uuid: app.context.noteUUID};
            const fileURL = await app.attachNoteMedia(noteHandle, pngDataURL);
            const appendedFileURL = fileURL + '?text=' +
                window.encodeURIComponent(Buffer.from(text, "utf8").toString('base64'));
            // Note: The (<a> </a>) is a temporary hack to get image markdown to be supported by replaceSelection. Remove this later.
            app.context.replaceSelection(`<a> </a>![${text || ''}](${appendedFileURL})<a> </a>`);
            return null;
        } catch (e) {
            app.alert('Failed _toDiagram - ' + e);
        }
    },
    async _toText(app, image) {
        try {
            const url = new URL(image.src);
            if (url.searchParams.get("text") == null) throw new Error("No text information found in image. It is possible that the image was not created by this plugin.");
            let text = Buffer.from(window.decodeURIComponent(url.searchParams.get("text")), 'base64').toString('utf8');
            console.log(text);
            app.context.replaceSelection(text);
        } catch (e) {
            app.alert('Failed _toText - ' + e);
        }
    },
    async _svgToPng(svgBase64) {
        return new Promise(async function (resolve, reject) {
            let image = new Image();
            image.src = svgBase64;
            image.onload = function () {
                let canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                let context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                let output = canvas.toDataURL('image/png');
                resolve(output);
            };
        });
    },
    async _dataURLFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = event => {
                resolve(event.target.result);
            };

            reader.onerror = function (event) {
                reader.abort();
                reject(event.target.error);
            };

            reader.readAsDataURL(blob);
        });
    }
};

export default plugin;
