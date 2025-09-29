import { errorToString } from "../../frontend-chat/helpers/errorToString.js";

export const ErrorView = ({ errorObj }) => {
    const { Flex, Text, Button } = window.RadixUI;

    return (
        <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
            <Text size="3">Error with speech recognition</Text>
            <Text size="2" color="red">{errorToString(errorObj)}</Text>
            <Button size="3" variant="outline" onClick={() => window.location.reload()}>
                Try Again
            </Button>
        </Flex>
    );
};
