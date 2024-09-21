import {inlineAssetsOfHTML} from "../esbuild-plugins/htmlLoader.js";
import makeSynchronous from "make-synchronous";
const inlineAssetsOfHTMLSync = makeSynchronous(inlineAssetsOfHTML);

export default {
    process(sourceText, sourcePath, options) {
        const [html, assets, errors] = inlineAssetsOfHTMLSync(sourceText, sourcePath, 'js');
        if(errors.length > 0) {
            throw new Error(JSON.stringify(errors));
        }
        return {
            code: `module.exports = ${JSON.stringify(html)};`,
            map: null
        };
    },
};