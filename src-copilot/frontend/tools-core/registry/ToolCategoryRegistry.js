import {ToolRegistry} from "./ToolRegistry.js";

export class ToolCategoryRegistry {
    static categories = [];

    static registerAllCategory() {
        ToolCategoryRegistry.categories.push({
            name: "tasks",
            description: `Enables tools for working with amplenote tasks:
            ${ToolRegistry.getToolsByCategory("tasks")
                .map(tool => tool.unstable_tool.toolName).join('\n ')}`.replaceAll('\n', '&#013;').replace(/\s+/g, ' ').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "notes",
            description: `Enables tools for working with amplenote notes:
            ${ToolRegistry.getToolsByCategory("notes")
                .map(tool => tool.unstable_tool.toolName).join('\n ')}`.replaceAll('\n', '&#013;').replace(/\s+/g, ' ').trim()
        });
        ToolCategoryRegistry.categories.push({
            name: "web",
            description: `Enables tools for searching the web:
            ${ToolRegistry.getToolsByCategory("web")
                .map(tool => tool.unstable_tool.toolName).join('\n ')}`.replaceAll('\n', '&#013;').replace(/\s+/g, ' ').trim()
        });
    }

    static getCategory(categoryName) {
        return ToolCategoryRegistry.categories.find(category => category.name === categoryName);
    }

    static getAllCategoriesNames() {
        return ToolCategoryRegistry.categories.map(category => category.name);
    }
}