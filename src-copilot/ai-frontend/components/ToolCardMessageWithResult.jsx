import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessageWithResult = ({ text, result, color = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const { Text, Button, ChevronDownIcon, ScrollArea, Code } = window.RadixUI;
    return (
        <ToolCardContainer>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text color={color}>{text}</Text>
                <Button onClick={toggleCollapse} style={{ marginLeft: '8px' }} size="1" variant="soft">
                    <ChevronDownIcon style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                </Button>
            </div>
            {!isCollapsed && <div style={{ marginTop: '6px', position: 'relative' }}>
                <ScrollArea scrollbars="horizontal" style={{ paddingBottom: '6px' }}>
                    <Code highContrast wrap={'nowrap'}>{result.toString()}</Code>
                </ScrollArea>
            </div>}
        </ToolCardContainer>
    )
}