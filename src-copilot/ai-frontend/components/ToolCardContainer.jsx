export const ToolCardContainer = ({children}) => {
    return <div style={{height: 'fit-content', marginBottom: '2px'}}>
        <RadixUI.Card>
            {children}
        </RadixUI.Card>
    </div>
}