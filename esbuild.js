import * as esbuild from 'esbuild';
import {promises as fs} from "fs";
import express from 'express';
import path from 'path';
import cors from 'cors';
import {readFile} from 'fs/promises';
import _ from 'lodash';

// -- Custom Plugins for ESBuild --
const postProcessAndWritePlugin = {
    name: 'post-process-and-write-on-end',
    setup(build) {
        let count = 0;
        const targetFolderName = build.initialOptions.entryPoints[0].split('/').slice(-2, -1)[0];
        build.onEnd(async result => {
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
            // Add a process.env.NODE_ENV = "production" to the beginning of the file
            result = result.replace(/^\(\(\) => \{$/gm,
                "(() => {\n  var process = {env: {NODE_ENV: \"production\"}};");
            // Add git repositoryLink to beginning of the file
            const {repositoryLink, author} = await(readFile('./package.json').then((data) => {
                return {repositoryLink: JSON.parse(data).repository, author: JSON.parse(data).author};
            }));
            result = result.replace(/^\(\(\) => \{$/gm,
                "/***\n * Source Code: " + repositoryLink + "\n * Author: " + author +
                "\n * Target Folder: " + targetFolderName + "\n ***/\n\n(() => {");
            // Remove any lines attempting to import module using the esbuild __require
            result = result.replace(/^\s+var import_.+= (?:__toESM\()?__require\(".+"\).*;/gm, "");
            return result;
        }
        const handleProcessingPluginAboutJS = async (result, pluginJSResult) => {
            try {
                result = result.replace(/^}\)\(\);$/gm, "  return plugin_about_default;\n})()");
                const pluginAboutObj = eval(result);
                const { name, description, settings, version, template } = pluginAboutObj;
                let markdown = `| | |\n|-|-|\n`;
                markdown += name ? `| name | ${name} |\n` : '';
                markdown += description ? `| description | ${description} |\n` : '';
                if (settings && typeof settings === 'object') {
                    for (const setting of settings) {
                        markdown += `| setting | ${setting} |\n`;
                    }
                }
                markdown += name ? `# ${name} ${version ? `(v${version})` : ''}\n` : '';
                let code = '';
                code += '```js\n';
                code += pluginJSResult;
                code += '```';
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
const customHTMLLoader = {
    name: 'html-loader',
    setup(build) {
        async function inlineAssets(html, regex, htmlPath, assetType) {
            const matches = html.matchAll(regex);
            const watchFiles = [];
            const errors = [];

            for (const match of matches) {
                const [fullMatch, assetPath] = match;
                let absolutePath = '';
                try {
                    absolutePath = path.resolve(path.dirname(htmlPath), assetPath);
                } catch (error) {
                    console.error(`Error processing ${assetPath}:`, error);
                    errors.push({ text: `Error processing ${assetPath}:: ${error.message}` });
                    return ['', watchFiles, errors];
                }
                const ctx = await esbuild.context({
                    ...esbuildOptions,
                    entryPoints: [absolutePath],
                    sourcemap: false,
                    metafile: true,
                });
                const result = await ctx.rebuild();
                let inlinedContent = result.outputFiles[0].text;
                errors.push(...result.errors);
                await ctx.dispose();

                watchFiles.push(absolutePath);
                const meta = result.metafile;
                for (const file in meta.inputs) {
                    watchFiles.push(path.resolve(file));
                }

                if (assetType === 'js') {
                    html = html.replace(fullMatch, `<script>${inlinedContent}</script>`);
                } else if (assetType === 'css') {
                    html = html.replace(fullMatch, `<style>${inlinedContent}</style>`);
                }
            }

            return [html, watchFiles, errors];
        }

        build.onResolve({ filter: /^inline:/ }, args => {
            try {
                return {
                    path: path.resolve(args.resolveDir, args.path.slice(7)),
                    namespace: 'inline-html'
                };
            } catch (error) {
                return { errors: [{ text: `Failed to resolve inline path: ${error.message}` }] };
            }
        });

        build.onLoad({ filter: /.*/, namespace: 'inline-html' }, async (args) => {
            let html = await fs.readFile(args.path, 'utf8');
            let watchFiles = [];
            let errors = [];
            [html, watchFiles, errors] = await inlineAssets(html, /<script src="([^"]+)"><\/script>/g, args.path, 'js');
            let watchFiles2 = [];
            let errors2 = [];
            [html, watchFiles2, errors2] = await inlineAssets(html, /<link rel="stylesheet" href="([^"]+)">/g, args.path, 'css');

            return {
                contents: html,
                watchFiles: [...watchFiles, ...watchFiles2],
                errors: [...errors, ...errors2],
                loader: 'text'
            };
        });
        build.onLoad({ filter: /\.html$/ }, async (args) => {
            let html = await fs.readFile(args.path, 'utf8');
            let watchFiles = [];
            let errors = [];
            [html, watchFiles, errors] = await inlineAssets(html, /<script src="([^"]+)"><\/script>/g, args.path, 'js');
            let watchFiles2 = [];
            let errors2 = [];
            [html, watchFiles2, errors2] = await inlineAssets(html, /<link rel="stylesheet" href="([^"]+)">/g, args.path, 'css');

            return {
                contents: html,
                watchFiles: [...watchFiles, ...watchFiles2],
                errors: [...errors, ...errors2],
                loader: 'copy'
            };
        });
    },
};

// -- ESBuild Options --
export const esbuildOptions = {
    bundle: true,
    sourcemap: true,
    write: false, // Don't write to disk, instead return outputFiles
    platform: 'browser',
    outdir: 'dist',
    plugins: [customHTMLLoader]
}

// -- Start the server --
async function startServer(ctx, pluginTargetPath) {
    const app = express();
    const port = 3000;

    app.use(cors());

    // Endpoint to provide the out.plugin.js file
    app.get('/code', async (req, res) => {
        res.sendFile(path.resolve(`${pluginTargetPath}/../dist/out.plugin.js`));
    });

    // Endpoint to list all available pages
    app.get('/', async (req, res) => {
        try {
            const distFiles = await fs.readdir(path.resolve(`${pluginTargetPath}/../dist/embed`));
            const htmlFiles = distFiles.filter(file => file.startsWith('out.') && file.endsWith('.html'));

            let html = '<h1>Available Pages</h1><ul>';
            html += '<li><a href="/code">Plugin Code</a></li>';
            htmlFiles.forEach(file => {
                const originalName = file.replace('out.', '');
                html += `<li><a href="/embed/${originalName}">/embed/${originalName}</a></li>`;
            });
            html += '</ul>';

            res.send(html);
        } catch (error) {
            console.error('Error reading dist directory:', error);
            res.status(500).send('Error listing pages');
        }
    });

    // Serve HTML files from the embed folder
    app.get('/embed/:file', (req, res) => {
        const file = req.params.file;
        res.sendFile(path.resolve(`${pluginTargetPath}/../dist/embed/out.${file}`));
    });

    let server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    });

    server.on('close', () => {
        console.log('Server has stopped');
        ctx.dispose();
    });
}

// -- Main function --
async function main() {
    const pluginTargetPath = process.argv[2];
    if (!pluginTargetPath) {
        console.error('Please provide the path of the repository as a command-line argument.');
        process.exit(1);
    }

    const opts = _.cloneDeep(esbuildOptions);
    if (process.env.NODE_ENV !== 'test') {
        opts.format = 'iife';
        opts.plugins.push(postProcessAndWritePlugin);
        try {
            const htmlFiles = (await fs.readdir((`${pluginTargetPath}/embed`))).filter(file => file.endsWith('.html'));
            htmlFiles.forEach(file => {
                opts.entryPoints.push(`${pluginTargetPath}/embed/${file}`);
            });
        } catch {}
        opts.entryPoints = [`${pluginTargetPath}/plugin.js`];
        try {
            await fs.access(`${pluginTargetPath}/plugin.about.js`);
            opts.entryPoints.push(`${pluginTargetPath}/plugin.about.js`);
        }
        catch { }
    }
    const ctx = await esbuild.context(opts);

    if (process.argv.includes('--watch')) {
        await ctx.watch();
    }
    else {
        await ctx.rebuild();
        await ctx.dispose();
    }
    if (process.argv.includes('--server')) {
        await startServer(ctx, pluginTargetPath);
    }
}

main().catch((e) => {
    console.log("error"+e);
})