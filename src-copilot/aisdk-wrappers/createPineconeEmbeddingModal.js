export function createPineconeEmbeddingModal({apiKey}) {
    return {
        embedding(modelId, settings = {}) {
            return {
                specificationVersion: 'v1',
                provider: 'pinecone',
                modelId: modelId,
                maxEmbeddingsPerCall: 64,
                supportsParallelCalls: true,
                async doEmbed({ values }) {
                    const res = await fetch("https://api.pinecone.io/embed", {
                        headers: {
                            "accept": "*/*",
                            "api-key": apiKey,
                            "content-type": "application/json",
                            "x-pinecone-api-version": "2024-10"
                        },
                        body: JSON.stringify({
                            model: modelId,
                            inputs: values.map(input => ({text: input})),
                            parameters: {
                                input_type: settings.inputType ? settings.inputType.toLowerCase() : "passage",
                                truncate: "END"
                            }
                        }),
                        method: "POST",
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        const error = new Error(text);
                        error.statusCode = res.status;
                        throw error;
                    }

                    const json = await res.json();
                    return {
                        embeddings: json.data.map(embedding => embedding.values),
                        usage: json.usage ? { tokens: json.usage.total_tokens } : undefined
                    };
                }
            };
        }
    };
}