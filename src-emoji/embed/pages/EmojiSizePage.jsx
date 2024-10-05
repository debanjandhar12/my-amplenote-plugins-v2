import {getURLFromEmojiCode} from "../utils/getURLFromEmojiCode.jsx";

export const EmojiSizePage = ({selectedEmoji, submitButtonName, onSubmit}) => {
    const [isImageLoaded, setIsImageLoaded] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState("32px");

    React.useEffect(() => {
        const image = new Image();
        image.onload = () => {
            setIsImageLoaded(true);
        };
        image.src = getURLFromEmojiCode(selectedEmoji);
    }, [selectedEmoji]);

    const handleSizeChange = (event) => {
        setSelectedSize(event.target.value);
    };

    const handleSubmit = () => {
        onSubmit(selectedSize);
    };

    return <div className="emoji-size-page">
        <h1>Select emoji size</h1>
        {isImageLoaded &&  <div className="emoji-size-page-container">
            <div>
                <input type="radio" name="size" value="32px" id="size-34px" defaultChecked onChange={handleSizeChange}/>
                <label htmlFor="size-34px">
                    <img src={getURLFromEmojiCode(selectedEmoji)} alt={selectedEmoji} width="34" height="34"/>
                </label>
                <input type="radio" name="size" value="72px" id="size-72px" onChange={handleSizeChange}/>
                <label htmlFor="size-72px">
                    <img src={getURLFromEmojiCode(selectedEmoji)} alt={selectedEmoji} width="72" height="72"/>
                </label>
                <input type="radio" name="size" value="136px" id="size-136px" onChange={handleSizeChange}/>
                <label htmlFor="size-136px">
                    <img src={getURLFromEmojiCode(selectedEmoji)} alt={selectedEmoji} width="136" height="136"/>
                </label>
            </div>
            <button onClick={handleSubmit}>{submitButtonName}</button>
        </div>}
    </div>
};
