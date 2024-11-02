// Returns random four suggestions
export const getRandomSuggestions = () => {
    const allSuggestions = [
        {
            prompt: "Add shopping for groceries at evening today @tasks",
        },
        {
            prompt: "Summarize tasks for today @tasks",
        }
    ];
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
}