import { getLLMModel } from "../../aisdk-wrappers/getLLMModel.js";
import { generateText } from "../../aisdk-wrappers/generateText.js";

export const useAIFixTranscript = () => {
    const { useState } = window.React;
    
    const [isFixing, setIsFixing] = useState(false);

    const fixTranscript = async (text, onTextChange) => {
        if (!text || !text.trim() || !onTextChange) return;
        
        setIsFixing(true);
        try {
            const model = await getLLMModel(window.appSettings);
            const prompt = `You are an tool that fixes speech-to-text transcription errors. Your task is to:

1. Add proper punctuation (periods, commas, question marks, exclamation marks)
2. Fix capitalization (proper nouns, sentence beginnings)
3. Replace words that appear to be incorrectly transcribed with the most likely intended words based on context
4. Remove unnecessary filler words or repetitions if they seem like transcription errors
5. Maintain the original meaning and tone

Note: DO NOT return anything other than fixed transcript.

Please fix the following transcript:

${text}`;

            const response = await generateText(model, prompt);
            onTextChange({ target: { value: response.text } });
        } catch (error) {
            console.error('Error fixing transcript:', error);
        } finally {
            setIsFixing(false);
        }
    };

    return {
        isFixing,
        fixTranscript
    };
};
