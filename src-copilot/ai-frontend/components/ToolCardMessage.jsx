import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessage = ({text, color = false}) => {
    const { Text } = window.RadixUI;

    return <ToolCardContainer>
        <Text color={color}>{text}</Text>
    </ToolCardContainer>
}