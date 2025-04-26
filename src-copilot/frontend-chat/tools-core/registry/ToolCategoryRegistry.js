import {ToolRegistry} from "./ToolRegistry.js";

export class ToolCategoryRegistry {
    static categories = [];

    static registerAllCategory() {
        ToolCategoryRegistry.categories.push({
            name: "tasks",
            description: "<b>Enables tools for amplenote tasks:</b><br />" +
            ToolRegistry.getToolsByCategory("tasks")
                .map(tool => tool.unstable_tool.toolName).join('<br />').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "notes",
            description: "<b>Enables tools for amplenote notes:</b><br />" +
            ToolRegistry.getToolsByCategory("notes")
                .map(tool => tool.unstable_tool.toolName).join('<br />').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "web",
            description: "<b>Enables tools for searching the web:</b><br />" +
            ToolRegistry.getToolsByCategory("web")
                .map(tool => tool.unstable_tool.toolName).join('<br />').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "help",
            description: "<b>Enables tools for the help center:</b><br />" +
            ToolRegistry.getToolsByCategory("help")
                .map(tool => tool.unstable_tool.toolName).join('<br />').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "mcp",
            description: "<b>Enables tools for the help center:</b><br />" +
                ToolRegistry.getToolsByCategory("mcp")
                    .map(tool => tool.unstable_tool.toolName).join('<br />').trim()
        });
    }

    static getCategory(categoryName) {
        return ToolCategoryRegistry.categories.find(category => category.name === categoryName);
    }

    static getAllCategoriesNames() {
        return ToolCategoryRegistry.categories.map(category => category.name);
    }
}