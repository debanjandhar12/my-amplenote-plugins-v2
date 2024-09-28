import {definePlugin} from "@debanjandhar12/markmap-lib/plugins";
import {escape} from "lodash-es";

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
                    token.attrPush(['onclick', `window.app.navigate('${href}'); return false;`]);
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

export const headerAnchorPlugin = definePlugin({
    name: "headerAnchorPlugin",
    transform(transformHooks) {
        transformHooks.parser.tap((md) => {
            const originalRender = md.renderer.render.bind(md.renderer);
            md.renderer.render = function (tokens, options, env) {
                const html = originalRender(tokens, options, env);
                window.navigateToHeader = async (headerContent) => {
                    const sections = await appConnector.getNoteSections({ uuid: window.noteUUID });
                    const headerContentText = headerContent.replace(/<[^>]*>/g, '');
                    const sectionAnchor = sections.find(section => section.heading && section.heading.text === headerContentText);
                    if (!sectionAnchor) return;
                    const link = `https://www.amplenote.com/notes/${window.noteUUID}#${sectionAnchor.heading.anchor}`;
                    await appConnector.navigate(`${link}`);
                };
                return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/g, (match, level, attrs, content) => {
                    const anchor = `<a href="javascript:void(0);" onclick="navigateToHeader('${escape(content)}');" class="anchor">#</a>`;
                    return `<h${level} ${attrs}>${anchor}${content}</h${level}>`;
                });
            };
        });
        return {};
    },
});