import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

// TODO: https://github.com/missive/emoji-mart/issues/884
export const EmojiPickerPage = ({onSelectEmoji, onAddCustomEmoji}) => {
    const [data, setData] = React.useState(null);
    const [customEmojis, setCustomEmojis] = React.useState([]);
    const pickerRef = React.useRef();

    window.React.useEffect(() => {
        const fetchData = async () => {
            setData(await dynamicImportESM("@emoji-mart/data"));
        };
        fetchData();
    }, []);

    const fetchCustomEmojis = async () => {
        const customEmojis = await window.callAmplenotePlugin("getCustomEmojis");
        setCustomEmojis(customEmojis);
    };
    window.React.useEffect(() => {
        fetchCustomEmojis();
    }, []);

    window.React.useEffect(() => {
        if (pickerRef.current) {
            const searchContainer = document.getElementsByTagName('em-emoji-picker')[0].shadowRoot.querySelector('.search');
            if (searchContainer) {
                const button = document.createElement('button');
                button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M240 120v120H120c-8.8 0-16 7.2-16 16s7.2 16 16 16h120v120c0 8.8 7.2 16 16 16s16-7.2 16-16V272h120c8.8 0 16-7.2 16-16s-7.2-16-16-16H272V120c0-8.8-7.2-16-16-16s-16 7.2-16 16z"></path></svg>';
                button.style.marginLeft = '8px';
                button.title = 'Add custom emoji';
                button.onclick = async () => {
                    await onAddCustomEmoji();
                    await fetchCustomEmojis();
                }
                searchContainer.parentElement.appendChild(button);
            }
        }
    }, [data, pickerRef]);

    return (
        window.Picker &&
        <div ref={pickerRef}>
            <window.Picker
                data={data}
                onEmojiSelect={onSelectEmoji}
                theme={'dark'}
                onAddCustomEmoji={onAddCustomEmoji}
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