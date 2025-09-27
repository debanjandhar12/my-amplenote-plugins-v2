import {nodeModulesPolyfillPlugin} from "esbuild-plugins-node-modules-polyfill";
import dotenv from "dotenv";

dotenv.config();

function buildDefineObject() {
    process.env.NODE_ENV = process.env.NODE_ENV || "development";
    const defineObj = {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.BUILD_START_TIME': JSON.stringify(new Date().toISOString())
    };
    // In development and test environments, include all environment variables
    // In production, only include process.env.NODE_ENV for security
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        Object.keys(process.env).forEach(key => {
            defineObj[`process.env.${key}`] = JSON.stringify(process.env[key]);
        });
    }
    return defineObj;
}

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
    define: buildDefineObject(),
    plugins: [nodeModulesPolyfillPlugin({globals: { process: true }})]
}