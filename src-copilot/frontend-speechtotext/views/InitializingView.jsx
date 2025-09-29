export const InitializingView = () => {
    const { Flex, Text, Spinner } = window.RadixUI;

    return (
        <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
            <Spinner size="5" />
            <Text size="3">Initializing speech recognition...</Text>
        </Flex>
    );
};
