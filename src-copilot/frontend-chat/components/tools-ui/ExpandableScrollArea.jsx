export const ExpandableScrollArea = ({ children, style = {}, scrollAreaProps = {} }) => {
    const [isExpanded, setIsExpanded] = window.React.useState(false);
    const { ScrollArea } = window.RadixUI;
    const { EnterFullScreenIcon, ExitFullScreenIcon } = window.RadixIcons;
    const ReactDOM = window.ReactDOM || window.React.ReactDOM;

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Apply parent styles first, then override with our full screen styles
    const expandedStyle = {
        ...style,
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        minWidth: '100%',
        minHeight: '100%',
        zIndex: 9999,
        background: '#393a3a',
        borderRadius: '0',
        border: '1px solid #ccc',
        padding: '0',
        margin: '0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    };

    // For normal mode, apply parent styles first, then ensure position is relative
    const normalStyle = {
        ...style,
        position: 'relative'
    };

    const iconContainerStyle = {
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 10000, // Higher than the expanded area's z-index
        cursor: 'pointer',
        background: 'var(--white-a6)',
        borderRadius: '4px',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px'
    };

    // Button for normal mode
    const normalButton = (
        <div 
            style={iconContainerStyle}
            onClick={toggleExpand}
            title="View full page"
        >
            <EnterFullScreenIcon width={16} height={16} />
        </div>
    );

    // Content area for normal mode
    const normalContent = (
        <div>
            {normalButton}
            <ScrollArea
                style={normalStyle}
                type="auto"
                {...scrollAreaProps}
            >
                {children}
            </ScrollArea>
        </div>
    );

    // Expanded mode content with exit button
    const expandedContent = (
        <div>
            <ScrollArea
                style={expandedStyle}
                type="auto"
                {...scrollAreaProps}
            >
                {children}
            </ScrollArea>
            <div 
                style={{
                    ...iconContainerStyle,
                    position: 'fixed',
                    top: '15px',
                    right: '15px',
                    zIndex: 10001
                }}
                onClick={toggleExpand}
                title="Exit full page"
            >
                <ExitFullScreenIcon width={16} height={16} />
            </div>
        </div>
    );

    // Use portal for expanded mode
    console.log('isExpanded', window.ReactDOM);
    return isExpanded 
        ? window.ReactDOM.createPortal(expandedContent, document.body)
        : normalContent;
};
