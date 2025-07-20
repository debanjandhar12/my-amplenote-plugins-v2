import {ToolRegistry} from "./ToolRegistry.js";

export class ToolCategoryRegistry {
    static categories = [];

    static updateAllCategory() {
        ToolCategoryRegistry.categories = [];   // Clear existing categories

        // Get all unique categories from registered tools
        const allTools = ToolRegistry.getAllTools();
        const uniqueCategories = [...new Set(allTools
            .map(tool => tool.unstable_tool.category)
            .filter(category => category))]; // Filter out undefined categories

        // Create category objects with descriptions
        for (const categoryName of uniqueCategories) {
            const categoryTools = ToolRegistry.getToolsByCategory(categoryName);
            const description = this.getCategoryDescription(categoryName, categoryTools);
            
            ToolCategoryRegistry.categories.push({
                name: categoryName,
                description: description,
                toolCount: categoryTools.length
            });
        }
    }

    static getCategoryDescription(categoryName, tools) {
        const toolNames = tools.map(tool => tool.unstable_tool.toolName).join('<br />');
        
        const descriptions = {
            tasks: "<b>Enables tools for amplenote tasks:</b><br />",
            notes: "<b>Enables tools for amplenote notes:</b><br />",
            web: "<b>Enables tools for searching the web:</b><br />",
            help: "<b>Enables tools for the help center:</b><br />",
            mcp: "<b>Enables MCP (Model Context Protocol) tools:</b><br />"
        };

        const prefix = descriptions[categoryName] || `<b>Enables ${categoryName} tools:</b><br />`;
        return prefix + toolNames.trim();
    }

    static getToolsByCategory(categoryName) {
        return ToolRegistry.getToolsByCategory(categoryName);
    }

    static getCategory(categoryName) {
        return ToolCategoryRegistry.categories.find(category => category.name === categoryName);
    }

    static getAllCategoriesNames() {
        return ToolCategoryRegistry.categories.map(category => category.name);
    }

    static getAllCategories() {
        return ToolCategoryRegistry.categories;
    }
}