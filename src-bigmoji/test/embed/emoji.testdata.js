export const EMOJI_DATA_MOCK = {
    emojiUUID: 'mock-uuid',
    emojiCode: '1f61c',
    type: 'default',
    url: null,
    native: '😜',
    size: '64',
    skin: 1
}

export const EMBED_COMMANDS_MOCK = {
    "getCustomEmojis": async () => {
        return [{
                id: 'chart_custom',
                name: 'chart_custom',
                skins: [{ src: 'https://emojicdn.elk.sh/%F0%9F%93%8A?style=twitter' }],
        }];
    },
    "refreshTimeout": async () => true,
}
