import remarkParse from 'remark-parse'
import {unified} from 'unified'
import remarkGfm from 'remark-gfm'

export async function parse(markdownText) {
    return await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(markdownText);
}

