import {promises as fs} from "fs";
import {readFile} from "fs/promises";
import * as path from 'path';

/**
 * This esbuild plugin implements custom behavior for building the plugin and writing it to dist folder.
 * It handles writing embed html files, plugin.js and plugin.about.js files.
 */
export const DistWriterPlugin = {
    name: 'DistWriterPlugin',
    setup(build) {
        let count = 0;
        const targetFolderName = build.initialOptions.entryPoints[0].split('/').slice(-2, -1)[0];
        const outFolderPath = build.initialOptions.entryPoints[0].split('/').slice(0, -1).join('/')
            + '/../' + build.initialOptions.outdir;
        build.onEnd(async result => {
            if (!outFolderPath) {
                console.error('No outdir specified');
                return;
            }
            try {
                const files = await fs.readdir(outFolderPath);
                await Promise.all(files.map(file => fs.rm(path.join(outFolderPath, file), { recursive: true, force: true })));
            } catch (e) {
                if (e.code !== 'ENOENT') {
                    console.warn(e.message);
                }
            }
            if (result.errors.length > 0) {
                console.error(count === 0 ? `[${new Date()}] Build failed. - ${targetFolderName}` : `[${new Date()}] Rebuild failed. - ${targetFolderName}`);
                return;
            }
            let pluginJSResult = '';
            for (const outFile of result.outputFiles) {
                let result = outFile.text;
                if (outFile.path.split('/').pop() === 'plugin.js') {
                    result = await handleProcessingPluginJS(result);
                    pluginJSResult = result;
                }
                else if (outFile.path.split('/').pop() === 'plugin.about.js') {
                    result = await handleProcessingPluginAboutJS(result, pluginJSResult);
                    outFile.path = outFile.path.replace('plugin.about.js', 'out.plugin.about.md');
                }
                else if (outFile.path.split('/').pop() === 'plugin.about.js.map') {
                    continue;
                }
                const distDir = outFile.path.split('/').slice(0, -1).join('/');
                try {
                    await fs.access(distDir);
                } catch {
                    await fs.mkdir(distDir, {recursive: true});
                }
                await fs.writeFile(`${distDir}/out.${outFile.path.split('/').pop()}`, result);
            }
            console.log(count === 0 ? `[${new Date()}] Build successful - ${targetFolderName}.` : `[${new Date()}] Rebuild successful - ${targetFolderName}.`);
            count++;
        });
        // -- Handle processing different types of files --
        const handleProcessingPluginJS = async (result) => {
            result = result.replace(/^}\)\(\);$/gm, "  return plugin;\n})()");
            // Add git repositoryLink to beginning of the file
            const {repositoryLink, author} = await(readFile('./package.json').then((data) => {
                return {repositoryLink: JSON.parse(data).repository, author: JSON.parse(data).author};
            }));
            // Remove any lines attempting to import module using the esbuild __require
            result = result.replace(/^\s+var import_.+= (?:__toESM\()?__require\(".+"\).*;/gm, "");
            result = "/***\n * Source Code: " + repositoryLink + "\n * Author: " + author +
                "\n * Build: " + process.env.NODE_ENV +
                "\n * Character Count: " + result.length + ` (${(result.length/1000000).toPrecision(2)} M)` +
                "\n * Target Folder: " + targetFolderName + "\n ***/\n" + result;
            return result;
        }
        const handleProcessingPluginAboutJS = async (result, pluginJSResult) => {
            try {
                result = result.replace(/^}\)\(\);$/gm, "  return plugin_about_default;\n})()");
                const pluginAboutObj = eval(result);
                const { name, description, settings, version, icon, instructions, template } = pluginAboutObj;
                let markdown = `| | |\n|-|-|\n`;
                markdown += name ? `| name | ${name} |\n` : '';
                markdown += description ? `| description | ${description} |\n` : '';
                markdown += icon ? `| icon | ${icon} |\n` : '';
                markdown += instructions ? `| instructions | ${instructions} |\n` : '';
                if (settings && typeof settings === 'object') {
                    for (const setting of settings) {
                        markdown += `| setting | ${setting} |\n`;
                    }
                }
                markdown += name ? `\n\n\n# ${name} ${version ? `(v${version})` : ''}\n\n\n` : '';
                let code = '';
                code += '```js\n';
                code += pluginJSResult.length > 50000 ? '/* Plugin code too large to display */' : pluginJSResult;
                code += '\n```';
                if (template) {
                    markdown += template.replace('<<Code>>', code);
                }
                return markdown;
            } catch (error) {
                console.error('Error generating markdown:', error);
            }
        }
    },
}
