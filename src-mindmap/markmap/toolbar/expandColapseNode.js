export function expandAllNodes(markmap) {
    const { data } = markmap.state;

    function expand(node) {
        if (node.children) {
            node.payload = { ...node.payload, fold: 0 };
            node.children.forEach(expand);
        }
    }

    expand(data);
    markmap.setData(data);
}

export function collapseAllNodes(markmap) {
    const { data } = markmap.state;

    function collapse(node) {
        if (node.children) {
            node.payload = { ...node.payload, fold: 1 };
            node.children.forEach(collapse);
        }
    }

    collapse(data);
    markmap.setData(data);
}