// TODO: https://github.com/missive/emoji-mart/issues/884
export const EmojiPickerPage = ({onSelectEmoji, onAddCustomEmoji, initialSearch}) => {
    // - Initialize emoji data -
    const [data, setData] = React.useState(null);
    setTimeout(() => setData(window.EmojiData), 1);
    const [customEmojis, setCustomEmojis] = React.useState([]);
    const pickerRef = React.useRef();

    // - Custom Emoji handling and default search value -
    const fetchCustomEmojis = async () => {
        const customEmojis = await window.callAmplenotePlugin("getCustomEmojis");
        setCustomEmojis(customEmojis);
        if (pickerRef.current) {    // need to trigger search again after custom emojis are loaded
            const searchElement = document.getElementsByTagName('em-emoji-picker')[0].shadowRoot.querySelector('.search > input[type=search]');
            if (searchElement) {
                await new Promise(resolve => setTimeout(resolve, 320));
                searchElement.dispatchEvent(new Event('input'));
            }
        }
    }
    const handleAddCustomEmojiAndRefresh = async (emoji) => {
        await onAddCustomEmoji(emoji);
        await fetchCustomEmojis();
    }
    const addCustomEmojiInsertButton = async () => {
        if (pickerRef.current) {
            const searchContainer = document.getElementsByTagName('em-emoji-picker')[0].shadowRoot.querySelector('.search');
            if (searchContainer &&
                !document.getElementsByTagName('em-emoji-picker')[0].shadowRoot.querySelector('#custom-emoji-insert')) {
                const button = document.createElement('button');
                button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M240 120v120H120c-8.8 0-16 7.2-16 16s7.2 16 16 16h120v120c0 8.8 7.2 16 16 16s16-7.2 16-16V272h120c8.8 0 16-7.2 16-16s-7.2-16-16-16H272V120c0-8.8-7.2-16-16-16s-16 7.2-16 16z"></path></svg>';
                button.style.marginLeft = '8px';
                button.title = 'Add custom emoji';
                button.id = 'custom-emoji-insert';
                button.onclick = async () => {
                    await handleAddCustomEmojiAndRefresh();
                }
                searchContainer.parentElement.appendChild(button);
            }
        }
    }
    const setDefaultSearchValue = async () => {
        if (pickerRef.current && initialSearch) {
            const searchElement = document.getElementsByTagName('em-emoji-picker')[0].shadowRoot.querySelector('.search > input[type=search]');
            if (searchElement) {
                searchElement.value = initialSearch;
                searchElement.dispatchEvent(new Event('input'));
            }
        }
    }

    window.React.useEffect(() => {
        fetchCustomEmojis();
    }, []);

    window.React.useEffect(() => {
        addCustomEmojiInsertButton();
        setDefaultSearchValue();
        setTimeout(addCustomEmojiInsertButton, 320);
        setTimeout(setDefaultSearchValue, 320);
    }, [data, pickerRef]);

    return (
        window.Picker &&
        <div ref={pickerRef}>
            <window.Picker
                data={data}
                defaultValue={initialSearch}
                onEmojiSelect={onSelectEmoji}
                theme={'dark'}
                onAddCustomEmoji={handleAddCustomEmojiAndRefresh}
                set={'google'}
                emojiSize={36}
                skinTonePosition={'none'}
                emojiButtonSize={48}
                previewPosition={'none'}
                maxFrequentRows={1}
                dynamicWidth={true}
                custom={[{
                    id: 'custom',
                    name: 'Custom',
                    emojis: [
                        ...customEmojis
                    ],
                },]}
            />
        </div>
    );
};