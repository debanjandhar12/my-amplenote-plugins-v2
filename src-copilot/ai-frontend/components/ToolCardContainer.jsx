export const ToolCardContainer = ({children}) => {
    const { Card } = window.RadixUI;
    return <div style={{height: 'fit-content', marginBottom: '2px'}}>
        <Card>
            {children}
        </Card>
    </div>
}