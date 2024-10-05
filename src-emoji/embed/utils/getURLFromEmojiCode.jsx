export const getURLFromEmojiObj = (emojiObj) => {
    if(emojiObj.type === 'default') {
        return `https://cdn.jsdelivr.net/npm/emoji-datasource-google@15.0.1/img/google/64/${emojiObj.emojiCode}.png`;
    }
    return emojiObj.url;
}