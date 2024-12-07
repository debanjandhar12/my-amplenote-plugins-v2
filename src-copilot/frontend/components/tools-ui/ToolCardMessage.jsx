import {ToolCardContainer} from "./ToolCardContainer.jsx";

export const ToolCardMessage = ({icon, text, color = false}) => {
    const { Text, Flex } = window.RadixUI;

    return <ToolCardContainer>
        <Flex align="center" gap="2">
            {icon && icon}
            <Text color={color}>{text}</Text>
        </Flex>
    </ToolCardContainer>
}