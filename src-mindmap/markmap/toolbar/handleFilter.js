import {NODES_LIST} from "../../constants.js";
import {reloadMarkMap} from "../renderer.js";

export async function handleFilter(markmap) {
    const filteredNodesList = (await appConnector.getSettings()).FILTERED_NODE_LIST || NODES_LIST;
    const selection = await appConnector.prompt("Select nodes to show:", {
        inputs: NODES_LIST.split(',').map(node => {
            return { label: node, type: "checkbox", value: filteredNodesList.split(',').includes(node) }
        })
    });
    const selectorString = selection.map((selected, index) => selected ? NODES_LIST.split(',')[index] : null).filter((x)=>x).join(',');
    await appConnector.setSetting('FILTERED_NODE_LIST', selectorString);
    await reloadMarkMap(markmap);
}