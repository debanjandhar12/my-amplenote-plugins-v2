import {definePlugin} from "@debanjandhar12/markmap-lib/plugins";

export const amplenoteLinksPlugin = definePlugin({
    name: "amplenoteLinksPlugin",
    transform(transformHooks) {
        transformHooks.parser.tap((md) => {
            const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

            md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
                const token = tokens[idx];
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

export const amplenoteBackslashBreakPlugin = definePlugin({
    name: "ampleNoteBackslashBreakPlugin",
    transform(transformHooks) {
        transformHooks.parser.tap((md) => {
            md.inline.ruler.after('escape', 'backslash_newline', (state, silent) => {
                const pos = state.pos;
                if (state.src.charCodeAt(pos) !== '\\'.charCodeAt(0)) return;

                if (!silent) {
                    state.push('softbreak', 'br', 0);
                }

                state.pos++;
                return true;
            });
        });
        return {};
    }
});
