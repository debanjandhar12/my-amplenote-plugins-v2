import {createGenericCUDTool} from "../base/createGenericCUDTool.jsx";
import {ToolCardContainer} from "../../components/tools-ui/ToolCardContainer.jsx";
import {ToolFooter} from "../../components/tools-ui/ToolFooter.jsx";
import {ToolCardResultMessage} from "../../components/tools-ui/ToolCardResultMessage.jsx";


export function createMCPToolFromObj(mcpServerUrl, toolName, toolObj) {
    return createGenericCUDTool({
        toolName: `mcp-${toolName}`,
        description: toolObj.description,
        parameters: {
            type: "object",
            properties: toolObj.parameters?.jsonSchema?.properties,
            required: toolObj.parameters?.jsonSchema?.required
        },
        category: "mcp",
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@mcp")
            || JSON.stringify(allUserMessages).includes("@all-tools"),
        renderWaitingForUserInput: ({args, status, setFormState}) => {
            const { Text, ScrollArea, Separator, Code } = window.RadixUI;
            return (
                <ToolCardContainer>
                    <Text>The following action will be performed using MCP Server:</Text>
                    <ScrollArea scrollbars="horizontal" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                        <Text size="1" style={{ color: 'var(--gray-11)', marginBottom: '4px', display: 'block' }}>MCP Server:</Text>
                        <Text>{mcpServerUrl}</Text>
                        <Separator size="4" style={{ margin: '8px 0' }} />
                        <Text size="1" style={{ color: 'var(--gray-11)', marginBottom: '4px', display: 'block' }}>Tool ID:</Text>
                        <Text>{toolName}</Text>
                        <Separator size="4" style={{ margin: '8px 0' }} />
                        <Text size="1" style={{ color: 'var(--gray-11)', marginBottom: '4px', display: 'block' }}>Input:</Text>
                        <Code highContrast wrap={'nowrap'}>
                            {JSON.stringify(args)}
                        </Code>
                    </ScrollArea>
                    <ToolFooter
                        submitButtonText="Proceed"
                        cancelButtonText="Cancel"
                        status={status}
                        setFormState={setFormState}
                    />
                </ToolCardContainer>
            )
        },
        onSubmitted: async ({args, formData, setFormData, setFormState}) => {
            const mcpCallResult = await toolObj.execute(args);
            console.log(mcpCallResult);
            setFormData({...formData, mcpCallResult: mcpCallResult.content[0].text || mcpCallResult});
            setFormState("completed");
        },
        onCompleted: ({formData, addResult}) => {
            addResult({resultSummary: `Tool call successful.`, toolOutput: formData.mcpCallResult});
        },
        renderCompleted: ({formData, toolName, args}) => {
            const { MixIcon } = window.RadixIcons;
            return <ToolCardResultMessage
                result={formData.mcpCallResult}
                text={`mcp/${toolName} tool call completed successfully.`}
                icon={<MixIcon />}
                toolName={`mcp/${toolName}`}
                input={args} />
        }
    });
}