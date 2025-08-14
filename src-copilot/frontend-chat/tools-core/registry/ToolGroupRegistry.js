import {ToolRegistry} from "./ToolRegistry.js";

export class ToolGroupRegistry {
    static groups = [];

    static updateAllGroups() {
        ToolGroupRegistry.groups = [];   // Clear existing groups

        // Get all unique groups from registered tools
        const allTools = ToolRegistry.getAllTools();
        const uniqueGroups = [...new Set(allTools
            .map(tool => tool.unstable_tool.group)
            .filter(group => group))]; // Filter out undefined groups

        // Create group objects with descriptions
        for (const groupName of uniqueGroups) {
            const groupTools = ToolRegistry.getToolsByGroup(groupName);
            const description = this.getGroupDescription(groupName, groupTools);
            
            ToolGroupRegistry.groups.push({
                name: groupName,
                description: description,
                toolCount: groupTools.length
            });
        }
    }

    static getGroupDescription(groupName, tools) {
        const toolNames = tools.map(tool => tool.unstable_tool.toolName).join('<br />');
        
        const descriptions = {
            tasks: "<b>Enables tools for amplenote tasks:</b><br />",
            notes: "<b>Enables tools for amplenote notes:</b><br />",
            web: "<b>Enables tools for searching the web:</b><br />",
            help: "<b>Enables tools for the help center:</b><br />",
            mcp: "<b>Enables MCP (Model Context Protocol) tools:</b><br />"
        };

        const prefix = descriptions[groupName] || `<b>Enables ${groupName} tools:</b><br />`;
        return prefix + toolNames.trim();
    }

    static getToolsByGroup(groupName) {
        return ToolRegistry.getToolsByGroup(groupName);
    }

    static getGroup(groupName) {
        return ToolGroupRegistry.groups.find(group => group.name === groupName);
    }

    static getAllGroupNames() {
        return ToolGroupRegistry.groups.map(group => group.name);
    }

    static getAllGroups() {
        return ToolGroupRegistry.groups;
    }
}