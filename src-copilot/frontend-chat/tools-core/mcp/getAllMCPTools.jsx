import { EMBEDDING_SERVER_URL_LIST_SETTING } from "../../../constants.js";
import dynamicImportESM from "../../../../common-utils/dynamic-import-esm.js";
import {createMCPToolFromObj} from "./createMCPToolFromObj.jsx";

export async function getAllMCPTools() {
    const mcpServerList = window.appSettings[EMBEDDING_SERVER_URL_LIST_SETTING]?.split(',') || [];
    const toolList = [];
    if (mcpServerList.length > 0) {
        const { experimental_createMCPClient } = await dynamicImportESM("ai");
        for (const mcpServer of mcpServerList) {
            try {
                const client = await experimental_createMCPClient({
                    transport: {
                        type: 'sse',
                        url: mcpServer,
                    },
                });
                const toolSet = await client.tools();
                Object.keys(toolSet).forEach(key => {
                    toolList.push(createMCPToolFromObj(mcpServer, key, toolSet[key]));
                })
            } catch (e) {
                throw new Error(`Failed to connect to ${mcpServer}`);
            }
        }
    }
    return toolList;
}