import {getURLFromEmojiObj} from "../utils/getURLFromEmojiCode.jsx";

export const EmojiSizePage = ({selectedEmoji, onSubmit, setCurrentPage, setSelectedEmoji}) => {
    const [isImageLoaded, setIsImageLoaded] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState(null);
    const [submitButtonName, setSubmitButtonName] = React.useState('Submit');

    // Set default size based on old emojiObj
    React.useEffect(() => {
        const oldEmojiObj = window.emojiData;
        let newDefaultSize = null;
        if (oldEmojiObj) setSubmitButtonName('Update');
        if (oldEmojiObj && !selectedEmoji.size) {
            newDefaultSize = oldEmojiObj.size;
        }
        else newDefaultSize = selectedEmoji.size || '32';
        if (newDefaultSize === '15' && !selectedEmoji.native) {   // Case where new emoji is not native and hence size 15 not available
            newDefaultSize = '32';
        }
        setSelectedSize(newDefaultSize);
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

    React.useEffect(() => {
        setSelectedEmoji((prevEmoji) => {
            return {
                ...prevEmoji,
                size: selectedSize
            }
        });
    }, [selectedSize]);

    const handleSubmit = () => {
        onSubmit();
    };

    return <div className="emoji-size-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Select emoji size</h1>
            <a href="#"
               onClick={(e) => { e.preventDefault(); setCurrentPage('emoji-picker'); }}
               style={{ textDecoration: 'none', color: '#4a90e2', fontSize: '16px', fontWeight: '500', marginRight: '10px' }}>
                ← Back
            </a>
        </div>
        {isImageLoaded &&  <div className="emoji-size-page-container">
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {
                        selectedEmoji.native ?
                        <>
                        <input type="radio" name="size" value="15" id="size-15px" onChange={handleSizeChange} checked={selectedSize === '15'}/>
                        <label htmlFor="size-15px" >
                        <span style={{ padding: '10px', marginRight: '10px' }}>{selectedEmoji.native}</span>
                        </label>
                        </> : null
                    }
                    <input type="radio" name="size" value="32" id="size-32px" onChange={handleSizeChange} checked={selectedSize === '32'}/>
                    <label htmlFor="size-32px" >
                        <img src={getURLFromEmojiObj(selectedEmoji)} style={{ padding: '10px', marginRight: '10px' }} alt={selectedEmoji} width="32" height="32"/>
                    </label>
                    <input type="radio" name="size" value="64" id="size-64px" onChange={handleSizeChange} checked={selectedSize === '64'}/>
                    <label htmlFor="size-64px">
                        <img src={getURLFromEmojiObj(selectedEmoji)} style={{ marginLeft: '10px' }} alt={selectedEmoji} width="64" height="64"/>
                    </label>
                </div>
                <div style={{ marginTop: '10px' }}>
                    <input type="radio" name="size" value="128" id="size-128px" onChange={handleSizeChange} checked={selectedSize === '128'}/>
                    <label htmlFor="size-128px">
                        <img src={getURLFromEmojiObj(selectedEmoji)} alt={selectedEmoji} width="128" height="128"/>
                    </label>
                </div>
            </div>
            <button onClick={handleSubmit}>{submitButtonName}</button>
        </div>}
    </div>
};
