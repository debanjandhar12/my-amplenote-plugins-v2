export const useChatSuggestions = (thread, count = 2) => {
    const [suggestions, setSuggestions] = React.useState([]);

    React.useEffect(() => {
        try {
            setSuggestions(getRandomSuggestions(count));
        } catch (e) {
            console.error(e);
        }
    }, [thread]);

    return suggestions;
}

const allSuggestions = [
    {
        prompt: "@tasks Add shopping for groceries at evening today",
    },
    {
        prompt: "@tasks Summarize tasks for today",
    },
    {
        prompt: "@notes Summarize this note",
    },
    {
        prompt: "@notes Analyze and add appropriate tags to this note",
    }
];

const getRandomSuggestions = (count) => {
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}