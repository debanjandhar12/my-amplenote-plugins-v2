export class EmbeddingGeneratorBase {
    COST_PER_MILLION_TOKEN = null;
    MODEL_NAME = null;
    MAX_CONCURRENCY = null;
    IS_GENERATED_EMBEDDING_NORMALIZED = null;

    constructor(modelName, costPerMillionToken, isGeneratedEmbeddingNormalized, maxConcurrency = 1) {
        this.COST_PER_MILLION_TOKEN = costPerMillionToken;
        this.MODEL_NAME = modelName;
        this.IS_GENERATED_EMBEDDING_NORMALIZED = isGeneratedEmbeddingNormalized;
        this.MAX_CONCURRENCY = maxConcurrency;
    }

    async generateEmbedding(app, textArray, inputType) {
        throw new Error("Not implemented");
    }

    async getEmbeddingCost(app, textArrayCount) {
        if (this.COST_PER_MILLION_TOKEN === null)
            throw new Error("Cost per million tokens not set");
        const numTokens = textArrayCount * 512;
        return (numTokens / 1_000_000) * this.COST_PER_MILLION_TOKEN;
    }

    getProcessedTextArray(textArray, inputType, prefixForPassage, prefixForQuery) {
        if (typeof textArray === "string") {
            textArray = [textArray];
        }
        if (inputType.toLowerCase() === "passage") {
            textArray = textArray.map(text => prefixForPassage + text);
        }
        else if (inputType.toLowerCase() === "query") {
            textArray = textArray.map(text => prefixForQuery + text);
        }
        else {
            throw new Error("Invalid input type");
        }
        return textArray;
    }
}