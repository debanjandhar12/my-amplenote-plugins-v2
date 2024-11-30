import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessageWithResult = ({ icon, text, result, color = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const { Text, Button, ChevronDownIcon, ScrollArea, Code, Flex } = window.RadixUI;
    return (
        <ToolCardContainer>
            <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                    {icon && icon}
                    <Text color={color}>{text}</Text>
                </Flex>
                <Button onClick={toggleCollapse} size="1" variant="soft">
                    <ChevronDownIcon style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                </Button>
            </Flex>
            {!isCollapsed && <div style={{ marginTop: '6px', position: 'relative' }}>
                <ScrollArea scrollbars="horizontal" style={{ paddingBottom: '6px' }}>
                    <Code highContrast wrap={'nowrap'}>{result.toString()}</Code>
                </ScrollArea>
            </div>}
        </ToolCardContainer>
    )
}