import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessageWithResult = ({ icon, text, result, color = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);
    const [resolvedIcon, setResolvedIcon] = React.useState(icon);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Set default icon
    React.useEffect(() => {
        if (window.RadixIcons && !icon) {
            const { CheckCircledIcon } = window.RadixIcons;
            setResolvedIcon(<CheckCircledIcon />);
        }
    }, [icon]);

    const { Text, Button, ChevronDownIcon, ScrollArea, Code, Flex } = window.RadixUI;
    return (
        <ToolCardContainer>
            <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                    {resolvedIcon && resolvedIcon}
                    {Text && <Text color={color}>{text}</Text>}
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
    );
}