import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessageWithResult = ({ text, result, color = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return <ToolCardContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <RadixUI.Text color={color}>{text}</RadixUI.Text>
            <RadixUI.Button onClick={toggleCollapse} style={{ marginLeft: '8px' }} size="1" variant="soft">
                <RadixUI.ChevronDownIcon style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
            </RadixUI.Button>
        </div>
        {!isCollapsed && <div style={{ marginTop: '6px', position: 'relative' }}>
            <RadixUI.ScrollArea scrollbars="horizontal" style={{ paddingBottom: '6px' }}>
                <RadixUI.Code highContrast wrap={'nowrap'}>{result.toString()}</RadixUI.Code>
            </RadixUI.ScrollArea>
        </div>}
    </ToolCardContainer>
}