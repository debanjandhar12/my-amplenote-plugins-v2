import {getURLFromEmojiObj} from "../utils/getURLFromEmojiCode.jsx";

export const EmojiSizePage = ({selectedEmoji, onSubmit}) => {
    const [isImageLoaded, setIsImageLoaded] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState("32");
    const [submitButtonName, setSubmitButtonName] = React.useState('Submit');

    React.useEffect(() => { // TODO: Fix this
        const oldEmojiObj = window.emojiData;
        if (oldEmojiObj) {
            setSelectedSize(oldEmojiObj.size);
            setSubmitButtonName('Update');
        }
    }, []);

    React.useEffect(() => {
        const image = new Image();
        image.onload = () => {
            setIsImageLoaded(true);
        };
        image.src = getURLFromEmojiObj(selectedEmoji);
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <input type="radio" name="size" value="32" id="size-32px" defaultChecked onChange={handleSizeChange}/>
                    <label htmlFor="size-32px" >
                        <img src={getURLFromEmojiObj(selectedEmoji)} style={{ padding: '10px', marginRight: '10px' }} alt={selectedEmoji} width="32" height="32"/>
                    </label>
                    <input type="radio" name="size" value="64" id="size-64px" onChange={handleSizeChange}/>
                    <label htmlFor="size-64px">
                        <img src={getURLFromEmojiObj(selectedEmoji)} style={{ marginLeft: '10px' }} alt={selectedEmoji} width="64" height="64"/>
                    </label>
                </div>
                <div style={{ marginTop: '10px' }}>
                    <input type="radio" name="size" value="128" id="size-128px" onChange={handleSizeChange}/>
                    <label htmlFor="size-128px">
                        <img src={getURLFromEmojiObj(selectedEmoji)} alt={selectedEmoji} width="128" height="128"/>
                    </label>
                </div>
            </div>
            <button onClick={handleSubmit}>{submitButtonName}</button>
        </div>}
    </div>
};
