import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardErrorMessage = ({ icon, text, toolName, input }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);
    const [resolvedIcon, setResolvedIcon] = React.useState(icon);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Set default icon
    React.useEffect(() => {
        if (window.RadixIcons && !icon) {
            const { ExclamationTriangleIcon } = window.RadixIcons;
            setResolvedIcon(<ExclamationTriangleIcon />);
        }
    }, [icon]);

    const { Text, Button, ChevronDownIcon, ScrollArea, Code, Flex, Separator } = window.RadixUI;

    return (
        <ToolCardContainer>
            <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                    {resolvedIcon && resolvedIcon}
                    {text && <Text style={{ color: 'var(--red-9)' }}>{text}</Text>}
                </Flex>
                <Button onClick={toggleCollapse} size="1" variant="soft">
                    <ChevronDownIcon style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                </Button>
            </Flex>
            {!isCollapsed && (
                <div style={{ marginTop: '6px', position: 'relative' }}>
                    <ScrollArea scrollbars="horizontal" style={{ paddingBottom: '6px' }}>
                        {toolName && (
                            <>
                                <Text size="1" style={{ color: 'var(--gray-11)', marginBottom: '4px', display: 'block' }}>
                                    Tool Name:
                                </Text>
                                <Text>{toolName}</Text>
                                <Separator size="4" style={{ margin: '8px 0' }} />
                            </>
                        )}
                        {input && (
                            <>
                                <Text size="1" style={{ color: 'var(--gray-11)', marginBottom: '4px', display: 'block' }}>
                                    Input:
                                </Text>
                                <Code highContrast wrap={'nowrap'}>
                                    {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
                                </Code>
                            </>
                        )}
                    </ScrollArea>
                </div>
            )}
        </ToolCardContainer>
    );
};
