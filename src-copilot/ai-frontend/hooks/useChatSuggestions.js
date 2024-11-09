export const useChatSuggestions = (thread, count = 4) => {
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
        prompt: "Add shopping for groceries at evening today @tasks",
    },
    {
        prompt: "Summarize tasks for today @tasks",
    }
];

const getRandomSuggestions = (count) => {
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}