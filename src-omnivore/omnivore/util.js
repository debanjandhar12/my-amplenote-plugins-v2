// Source: https://github.com/omnivore-app/logseq-omnivore/blob/develop/src/util.ts (heavily modified)


export const parseDateTime = str => {
    return Date.parse(str) || new Date(0);
}