import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessage = ({text, color = false}) => {
    return <ToolCardContainer>
        <RadixUI.Text color={color}>{text}</RadixUI.Text>
    </ToolCardContainer>
}