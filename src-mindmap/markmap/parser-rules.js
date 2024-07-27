export const selectorRules = {
    'div': ({ $node }) => {
        // console.log('div', $node);
        return {
            queue: $node.children(),
        };
    },
    'h1,h2,h3,h4,h5,h6': ({ $node, getContent }) => {
        // console.log('heading', $node);
        return {
            ...getContent($node.contents()),
        };
    },
    'ul,ol': ({ $node }) => {
        // console.log('list', $node);
        return {
            queue: $node.children(),
            nesting: true,
        };
    },
    'li': ({ $node, getContent }) => {
        // console.log('list item', $node);
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
    'table': ({ $node, getContent }) => {
        // console.log('table', $node, getContent($node));
        return {
            ...getContent($node),
        };
    },
    'pre': ({ $node, getContent }) => {
        // console.log('pre', $node, getContent($node));
        return {
            ...getContent($node),
        };
    },
    'p': ({ $node, getContent }) => {
        // console.log('paragraph', $node, getContent($node.contents()));
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
        // console.log('img', $node, getContent($node));
        return {
            ...getContent($node),
        };
    },
};