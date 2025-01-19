import {promises as fs} from "fs";
import path from 'path';

/**
 * This esbuild plugin implements custom behavior for loading html files and inlined html files.
 */
export const HtmlLoaderPlugin = {
    name: 'HtmlLoaderPlugin',
    setup(build) {
        build.onResolve({ filter: /inline:.*\.html$/ }, args => {
            try {
                return {
                    path: path.resolve(args.resolveDir, args.path.substring(7)),
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
            [html, watchFiles, errors] = await inlineAssetsOfHTML(html, args.path, 'js');
            let watchFiles2 = [];
            let errors2 = [];
            [html, watchFiles2, errors2] = await inlineAssetsOfHTML(html, args.path, 'css');

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
            [html, watchFiles, errors] = await inlineAssetsOfHTML(html, args.path, 'js');
            let watchFiles2 = [];
            let errors2 = [];
            [html, watchFiles2, errors2] = await inlineAssetsOfHTML(html, args.path, 'css');

            return {
                contents: html,
                watchFiles: [...watchFiles, ...watchFiles2],
                errors: [...errors, ...errors2],
                loader: 'copy'
            };
        });
    },
};

export async function inlineAssetsOfHTML(html, htmlPath, assetType) {
    // Following import statements are needed to make
    // inlineAssetsOfHTML work with jest-transformers/htmlTransformer.js.
    const path = await import('path') || path;
    const esbuild = await import('esbuild') || esbuild;
    let esBuildOptionsPath = path.resolve(process.argv[2] || './build/', '../build/esbuild-options.js');
    const {esbuildOptions} = await import(esBuildOptionsPath) || {esbuildOptions};

    // Actual Code
    const watchFiles = [];
    const errors = [];

    let regex;
    if (assetType === 'js') {
        regex = /<script src="([^"]+)"><\/script>/g;
    } else if (assetType === 'css') {
        regex = /<link rel="stylesheet" href="([^"]+)"><\/link>/g;
    }

    const matches = html.matchAll(regex);
    for (const match of matches) {
        const [fullMatch, assetPath] = match;
        let absolutePath = '';
        try {
            absolutePath = path.resolve(path.dirname(htmlPath), assetPath);
        } catch (error) {
            console.error(`Error resolving ${assetPath}:`, error);
            errors.push({ text: `Error resolving ${assetPath}:: ${error.message}` });
        }
        try {
            const ctx = await esbuild.context({
                ...esbuildOptions,
                entryPoints: [absolutePath],
                sourcemap: false,
                metafile: true,
                format: 'iife',
                legalComments: 'none'
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
                html = html.replace(fullMatch, () => `<script>${inlinedContent}</script>`);
            } else if (assetType === 'css') {
                html = html.replace(fullMatch, () => `<style>${inlinedContent}</style>`);
            }
        } catch (error) {
            console.error(`Error processing ${assetPath}:`, error);
            errors.push({ text: `Error processing ${assetPath}:: ${error.message}` });
        }
    }

    return [html, watchFiles, errors];
}
