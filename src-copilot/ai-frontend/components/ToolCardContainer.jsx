export const ToolCardContainer = ({children}) => {
    const { Card } = RadixUI;
    return <div style={{height: 'fit-content', marginBottom: '2px'}}>
        <Card>
            {children}
        </Card>
    </div>
}