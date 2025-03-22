export const EndlessScroll = ({data, iterationCnt, itemContent}) => {
    const {ScrollArea, Flex, Spinner} = window.RadixUI;
    const {Virtuoso} = window.ReactVirtuoso;
    const [currentMultiplier, setCurrentMultiplier] = React.useState(1);
    console.log(data, data.slice(0, iterationCnt*currentMultiplier), currentMultiplier);
    return (
        <ScrollArea>
            <Virtuoso
                data={data.slice(0, iterationCnt*currentMultiplier)}
                useWindowScroll={true}
                itemContent={itemContent}
                endReached={() => {
                    setTimeout(() => {
                        if (data.length > iterationCnt*(currentMultiplier)) {
                            setCurrentMultiplier(currentMultiplier + 1);
                        }
                    }, 1000);
                }}
                components={{
                    Footer: () => data.length > iterationCnt*(currentMultiplier) && <Flex direction={'column'} align={'center'} justify={'center'}>
                        <Spinner size="3" />
                    </Flex>
                }}
                style={{height:'100%'}}
            />
        </ScrollArea>
    );
}