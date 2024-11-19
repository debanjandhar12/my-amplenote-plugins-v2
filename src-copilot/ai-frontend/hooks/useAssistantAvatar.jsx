import {CUSTOM_LLM_AVATAR_SETTING} from "../../constants.js";

export const useAssistantAvatar = () => {
    const [assistantAvatar, setAssistantAvatar] = React.useState({fallback: ""});
    React.useEffect(() => {
        const fetchAssistantAvatar = async () => {
            const assistantAvatarSrc = window.appSettings[CUSTOM_LLM_AVATAR_SETTING];
            if (assistantAvatarSrc) {
                if (await isValidImageUrl(assistantAvatarSrc)) {
                    setAssistantAvatar({src: assistantAvatarSrc});
                } else {
                    setAssistantAvatar({fallback: "A"});
                    console.error(`Invalid image URL: ${assistantAvatarSrc}`);
                }
            }
        }
        fetchAssistantAvatar();
    }, []);
    return assistantAvatar;
}

const isValidImageUrl = async (url) => {
    if (!url) return false;
    if (url.trim() === '') return false;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
};
