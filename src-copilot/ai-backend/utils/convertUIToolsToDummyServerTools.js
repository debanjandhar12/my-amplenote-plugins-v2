export const convertUIToolsToDummyServerTools = (tools) => {
    return tools.reduce((acc, tool) => {
        acc[tool.unstable_tool.toolName] = {
            description: tool.unstable_tool.description,
            parameters: tool.unstable_tool.parameters
        };
        return acc;
    }, {});
}