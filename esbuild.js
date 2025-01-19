import * as esbuild from 'esbuild';
import {promises as fs} from "fs";
import express from 'express';
import path from 'path';
import cors from 'cors';
import _ from 'lodash-es';
import {DistWriterPlugin} from "./build/esbuild-plugins/distWriter.js";
import {esbuildOptions} from "./build/esbuild-options.js";
import {HtmlLoaderPlugin} from "./build/esbuild-plugins/htmlLoader.js";
import {InlineJSLoader} from "./build/esbuild-plugins/inlineJSLoader.js";


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

    // Endpoint to serve .env file
    app.get('/.env', async (req, res) => {
        const fileContent = await fs.readFile(path.resolve(`${pluginTargetPath}/../.env`));
        res.send(fileContent);
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
        opts.entryPoints = [`${pluginTargetPath}/plugin.js`];
        opts.plugins.push(DistWriterPlugin);
        opts.plugins.push(HtmlLoaderPlugin);
        opts.plugins.push(InlineJSLoader);
        try {
            const htmlFiles = (await fs.readdir((`${pluginTargetPath}/embed`))).filter(file => file.endsWith('.html'));
            htmlFiles.forEach(file => {
                opts.entryPoints.push(`${pluginTargetPath}/embed/${file}`);
            });
        } catch {}
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