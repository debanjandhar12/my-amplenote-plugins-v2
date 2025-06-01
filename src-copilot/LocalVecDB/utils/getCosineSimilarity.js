import {getDotProduct} from "./getDotProduct.js";

export const getCosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error("Cannot calculated cosine similarity as vector are of different size");
    }
    const dotProduct = getDotProduct(vecA, vecB);
    const magnitudeA = Math.sqrt(getDotProduct(vecA, vecA));
    const magnitudeB = Math.sqrt(getDotProduct(vecB, vecB));
    const denominator = magnitudeA * magnitudeB;
    if (denominator === 0) {
        return 0;
    }
    return dotProduct / denominator;
}