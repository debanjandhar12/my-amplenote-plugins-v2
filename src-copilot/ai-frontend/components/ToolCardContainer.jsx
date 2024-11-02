export const ToolCardContainer = ({children}) => {
    return <div style={{height: 'fit-content'}}>
        <RadixUI.Card>
            {children}
        </RadixUI.Card>
    </div>
}