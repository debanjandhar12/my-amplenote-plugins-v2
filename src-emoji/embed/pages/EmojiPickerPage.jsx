import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

export const EmojiPickerPage = () => {
    console.log(React);
    // const [data, setData] = React.useState(null);

    // window.React.useEffect(() => {
    //     const fetchData = async () => {
    //         setData(await dynamicImportESM("emoji-picker-data"));
    //     };
    //     fetchData();
    // }, []);

    const handleEmojiSelect = (emoji) => {
        console.log(emoji);
    };

    return <>aaa</>;
};