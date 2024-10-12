export const getURLFromEmojiObj = (emojiObj) => {
    if(emojiObj.type === 'default') {
        return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@15.1.2/img-google-136/${emojiObj.emojiCode}.png`;
    }
    return emojiObj.url;
}