import { Transformer } from 'markmap-lib/no-plugins';
import { definePlugin, pluginCheckbox, pluginHljs, pluginSourceLines } from "markmap-lib/plugins";

const amplenoteLinksPlugin = definePlugin({
    name: "amplenoteLinksPlugin",
    transform(transformHooks) {
        transformHooks.parser.tap((md) => {
            const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

            md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
                const token = tokens[idx];
                console.log(token);
                const hrefIndex = token.attrIndex('href');
                if (hrefIndex >= 0) {
                    const href = token.attrs[hrefIndex][1];
                    token.attrPush(['onclick', `window.callAmplenotePlugin('navigate', '${href}'); return false;`]);
                    token.attrs[hrefIndex][1] = 'javascript:void(0);';
                }
                return defaultRender(tokens, idx, options, env, self);
            };
        });
        return {};
    },
});

export function parseMarkdownAsMindMap(markdown) {
    const transformer = new Transformer([pluginCheckbox, pluginHljs, pluginSourceLines, amplenoteLinksPlugin]);
    return transformer.transform(markdown);
}
