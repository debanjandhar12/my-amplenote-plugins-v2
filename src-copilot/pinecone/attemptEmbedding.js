export async function attemptEmbedding(pineconeClient, textArray, inputType) {
    try {
        const result = await pineconeClient.inference.embed(
            'multilingual-e5-large',
            textArray,
            {inputType, truncate: 'END'}
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        return result;
    } catch (e) {
        if (e.message?.includes('rate limit') || e.message?.includes('failed to reach Pinecone')) {
            console.warn('Pinecone embedding rate limit error detected. Waiting for 60 seconds...', e);
            await handleRateLimit();
            return await pineconeClient.inference.embed(
                'multilingual-e5-large',
                textArray,
                {inputType, truncate: 'END'}
            );
        }
        throw e;
    }
}

async function handleRateLimit() {
    const RATE_LIMIT_DURATION_MS = 60000;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DURATION_MS));
}