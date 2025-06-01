import { singleDotProductJS } from "fast-dotproduct"

export const getDotProduct = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error("Cannot calculated dot product as vector are of different size");
    }
    // Note: performance benefit from singleDotProductWasm isn't worth it
    return singleDotProductJS(vecA, vecB);
}