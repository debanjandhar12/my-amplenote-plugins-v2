import {nodeModulesPolyfillPlugin} from "esbuild-plugins-node-modules-polyfill";

export const esbuildOptions = {
    bundle: true,
    sourcemap: true,
    write: false, // Don't write to disk, instead return outputFiles
    platform: 'browser',
    outdir: 'dist',
    target: 'es2019',
    treeShaking: process.env.NODE_ENV === 'production',
    minifySyntax: process.env.NODE_ENV === 'production',
    legalComments: 'none',
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
    },
    plugins: [nodeModulesPolyfillPlugin({globals: { process: true }})]
}