export function createWorkerFromString(workerCode) {
    try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    } catch (e) {
        // Fallback for environments where Blob URLs are not supported
        const dataURL = `data:application/javascript;base64,${btoa(workerCode)}`;
        return new Worker(dataURL);
    }
}