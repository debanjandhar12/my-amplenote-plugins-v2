import {promises as fs} from "fs";
import path from 'path';

export const InlineJSLoader = {
    name: 'InlineJSLoader',
    setup(build) {
        build.onResolve({ filter: /inline:.*\.js$/ }, args => {
            try {
                return {
                    path: path.resolve(args.resolveDir, args.path.substring(7)),
                    namespace: 'inline-js'
                };
            } catch (error) {
                return { errors: [{ text: `Failed to resolve inline path: ${error.message}` }] };
            }
        });

        build.onLoad({ filter: /.*/, namespace: 'inline-js' }, async (args) => {
            const content = await fs.readFile(args.path, 'utf8');
            const processed = await processJS(content, args.path);
            return {
                contents: processed[0],
                watchFiles: [...processed[1]],
                errors: [...processed[2]],
                loader: 'text'
            };
        });
    },
};

async function processJS(jsCode, jsPath) {
    const path = await import('path') || path;
    const esbuild = await import('esbuild') || esbuild;
    let esBuildOptionsPath = path.resolve(process.argv[2] || './build/', '../build/esbuild-options.js');
    const {esbuildOptions} = await import(esBuildOptionsPath) || {esbuildOptions};
    const watchFiles = [];
    const errors = [];
    let resultJSCode = jsCode;
    try {
        const ctx = await esbuild.context({
            ...esbuildOptions,
            entryPoints: [jsPath],
            sourcemap: false,
            metafile: true,
            format: 'cjs',
            legalComments: 'none'
        });
        const result = await ctx.rebuild();
        resultJSCode = result.outputFiles[0].text;
        errors.push(...result.errors);
        await ctx.dispose();

        watchFiles.push(jsPath);
        const meta = result.metafile;
        for (const file in meta.inputs) {
            watchFiles.push(path.resolve(file));
        }
    } catch (error) {
        console.error(`Error processing ${jsPath}:`, error);
        errors.push({ text: `Error processing ${jsPath}:: ${error.message}` });
    }
    console.log(resultJSCode);
    return [resultJSCode, watchFiles, errors];
}
