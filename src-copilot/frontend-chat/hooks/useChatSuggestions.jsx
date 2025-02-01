export const useChatSuggestions = (count = 2) => {
    const [suggestions, setSuggestions] = React.useState([]);
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();
    const threadId = threadListItemRuntime.getState().id;
    React.useEffect(() => {
        try {
            setSuggestions(getRandomSuggestions(count));
        } catch (e) {
            console.error(e);
        }
    }, [threadId]);

    return suggestions;
}

const allSuggestions = [
    {
        prompt: "@tasks Add shopping for groceries at evening today",
        displayCondition: () => true,
    },
    {
        prompt: "@tasks Summarize tasks for today",
        displayCondition: () => true,
    },
    {
        prompt: "@web Search for best song of current year",
        displayCondition: () => true,
    },
    {
        prompt: "@notes Provide summary of current note",
        displayCondition: () => window.userData.currentNoteUUID !== null,
    },
    {
        prompt: "@notes Analyze & add appropriate tags to current note",
        displayCondition: () => window.userData.currentNoteUUID !== null,
    }
];

const getRandomSuggestions = (count) => {
    const validSuggestions = allSuggestions.filter(suggestion => suggestion.displayCondition());
    const selectedIndices = [];
    const result = [];
    
    // Randomly select indices
    while (selectedIndices.length < count && selectedIndices.length < validSuggestions.length) {
        const randomIndex = Math.floor(Math.random() * validSuggestions.length);
        if (!selectedIndices.includes(randomIndex)) {
            selectedIndices.push(randomIndex);
            result.push(validSuggestions[randomIndex]);
        }
    }
    
    return result.sort((a, b) => // Sort based on original index to maintain order
        validSuggestions.indexOf(a) - validSuggestions.indexOf(b)
    );
}