import { Transformer } from 'markmap-lib/no-plugins';
import {definePlugin, pluginCheckbox, pluginFrontmatter, pluginHljs, pluginSourceLines} from "markmap-lib/plugins";

const amplenoteLinksPlugin = definePlugin({
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

const losslessSelectorRules = {
    'div': ({ $node }) => {
        console.log('div', $node);
        return {
            queue: $node.children(),
        };
    },
    'h1,h2,h3,h4,h5,h6': ({ $node, getContent }) => {
        console.log('heading', $node);
        return {
            ...getContent($node.contents()),
        };
    },
    'ul,ol': ({ $node }) => {
        console.log('list', $node);
        return {
            queue: $node.children(),
            nesting: true,
        };
    },
    li: ({ $node, getContent }) => {
        console.log('list item', $node);
        const queue = $node.children().filter('ul,ol');
        let content;
        if ($node.contents().first().is('div,p')) {
            content = getContent($node.children().first());
        } else {
            let $contents = $node.contents();
            const i = $contents.index(queue);
            if (i >= 0) $contents = $contents.slice(0, i);
            content = getContent($contents);
        }
        return {
            queue,
            nesting: true,
            ...content,
        };
    },
    'table,pre': ({ $node, getContent }) => {
        console.log('special', $node, getContent($node));
        return {
            ...getContent($node),
        };
    },
    'p': ({ $node, getContent }) => {
        console.log('paragraph', $node, getContent($node.contents()));
        const $images = $node.children().filter('img');
        if ($images.length) {
            console.log('images', $images);
            return {
                queue: $images,
                nesting: true,
                ...getContent($node.contents().not($images)),
            };
        }
        return {
            ...getContent($node.contents())
        };
    },
    'img': ({ $node, getContent }) => {
        console.log('img', $node, getContent($node));
        return {
            ...getContent($node),
        };
    },
};

export function parseMarkdownAsMindMap(markdown) {
    const transformer = new Transformer([pluginCheckbox, pluginHljs, pluginSourceLines, amplenoteLinksPlugin]);
    return transformer.transform(markdown, {selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li,table,pre,p,img', selectorRules:losslessSelectorRules});
}

function addTitleToRootNode(root: INode, title: string) {
    if (root.content == "") root.content = title;
    else root = { content: title, children: [root], type: 'heading', depth: 0 }
}